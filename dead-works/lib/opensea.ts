// lib/opensea.ts
import type { ProjectDef } from "@/data/projects";

const OPENSEA_BASE = "https://api.opensea.io/api/v2";

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function openseaFetch<T>(path: string, timeoutMs = 8000): Promise<T> {
  const apiKey = mustGetEnv("OPENSEA_API_KEY");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OPENSEA_BASE}${path}`, {
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
        "user-agent": "dead.works/1.0", // helps with some CDNs
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenSea error ${res.status}: ${text}`);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    // Normalize abort errors
    if (err?.name === "AbortError") {
      throw new Error(`OpenSea request timed out after ${timeoutMs}ms: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}


export async function resolveSlugFromContract(def: ProjectDef): Promise<string | null> {
  if (def.collectionSlug) return def.collectionSlug;
  if (!def.contractAddress) return null;

  // GET /api/v2/chain/{chain}/contract/{address}
  const data = await openseaFetch<{ collection?: string }>(
    `/chain/${encodeURIComponent(def.chain)}/contract/${def.contractAddress}`
  );

  return data.collection ?? null;
}

export async function getFloorBySlug(slug: string) {
  // GET /api/v2/collections/{slug}/stats
  const data = await openseaFetch<{
    total?: { floor_price?: number; floor_price_symbol?: string };
  }>(`/collections/${encodeURIComponent(slug)}/stats`);

  const floor = data.total?.floor_price ?? null;
  const symbol = data.total?.floor_price_symbol ?? null;
  return { floor, symbol };
}





// lib/opensea.ts
type CollectionResponse = {
  image_url?: string | null;
  banner_image_url?: string | null;
};

export async function getCollectionImage(slug: string) {
  // Collection metadata (includes the "featured" collection image)
  const data = await openseaFetch<CollectionResponse>(
    `/collections/${encodeURIComponent(slug)}`
  );

  // Prefer the normal collection image; fall back to banner if needed
  return data.image_url ?? data.banner_image_url ?? null;
}

type NftsResponse = {
  nfts?: Array<{
    image_url?: string | null;
    display_image_url?: string | null;
  }>;
};

const IMAGE_POOL_CACHE = new Map<string, { ts: number; images: string[] }>();
const IMAGE_POOL_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getRandomNftImageFromCollection(slug: string) {
  const now = Date.now();
  const cached = IMAGE_POOL_CACHE.get(slug);

  // Use cached pool if fresh
  if (cached && now - cached.ts < IMAGE_POOL_TTL_MS && cached.images.length > 0) {
    const idx = Math.floor(Math.random() * cached.images.length);
    return cached.images[idx];
  }

  // Build/refresh pool (fast: just first 50 NFTs)
  const data = await openseaFetch<NftsResponse>(
    `/collection/${encodeURIComponent(slug)}/nfts?limit=50`
  );

  const images =
    (data.nfts ?? [])
      .map((n) => n.image_url || n.display_image_url)
      .filter(Boolean) as string[];

  // cache pool (even if empty)
  IMAGE_POOL_CACHE.set(slug, { ts: now, images });

  if (images.length === 0) return null;

  const idx = Math.floor(Math.random() * images.length);
  return images[idx];
}
