import { NextResponse } from "next/server";
import { PROJECTS } from "@/data/projects";
import { getFloorBySlug, getCollectionImage } from "@/lib/opensea";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProjectOut = (typeof PROJECTS)[number] & {
  floor: number | null;
  symbol: string | null;
  image: string | null;
};

let CACHE: { ts: number; data: ProjectOut[] | null } = { ts: 0, data: null };
let REFRESHING: Promise<void> | null = null;

const CACHE_TTL_MS = 60_000; // 60s

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) break;
        results[idx] = await fn(items[idx]);
      }
    })
  );

  return results;
}

async function refreshCache() {
  const results = await mapLimit(PROJECTS, 6, async (p) => {
    try {
      const [{ floor, symbol }, image] = await Promise.all([
        getFloorBySlug(p.collectionSlug),
        getCollectionImage(p.collectionSlug),
      ]);
      return { ...p, floor: floor ?? null, symbol: symbol ?? null, image: image ?? null };
    } catch {
      return { ...p, floor: null, symbol: null, image: null };
    }
  });

  results.sort((a, b) => (b.floor ?? -1) - (a.floor ?? -1));
  CACHE = { ts: Date.now(), data: results };
}

export async function GET() {
  const now = Date.now();
  const hasCache = Boolean(CACHE.data);
  const isFresh = now - CACHE.ts < CACHE_TTL_MS;

  // If we have fresh cache, return it immediately
  if (hasCache && isFresh) {
    return NextResponse.json(
      { updatedAt: CACHE.ts, projects: CACHE.data },
      { headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=60" } }
    );
  }

  // If cache exists but is stale: return stale immediately, refresh in background
  if (hasCache && !isFresh) {
    if (!REFRESHING) {
      REFRESHING = refreshCache().finally(() => (REFRESHING = null));
      // don't await
    }
    return NextResponse.json(
      { updatedAt: CACHE.ts, projects: CACHE.data },
      { headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=60" } }
    );
  }

  // No cache yet (first hit): do one refresh (bounded by your opensea timeout)
  await refreshCache();

  return NextResponse.json(
    { updatedAt: CACHE.ts, projects: CACHE.data ?? [] },
    { headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=60" } }
  );
}
