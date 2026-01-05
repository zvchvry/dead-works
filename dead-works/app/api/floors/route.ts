import { NextResponse } from "next/server";
import { PROJECTS } from "@/data/projects";
import { getFloorBySlug, getCollectionImage } from "@/lib/opensea";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// simple concurrency limiter (no deps)
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

export async function GET() {
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

  return NextResponse.json(
    { updatedAt: Date.now(), projects: results },
    {
      headers: {
        // Vercel edge cache for the JSON response (helps performance)
        "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
