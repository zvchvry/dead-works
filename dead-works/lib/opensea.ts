// lib/opensea.ts
import type { ProjectDef } from "@/data/projects";

const OPENSEA_BASE = "https://api.opensea.io/api/v2";

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function openseaFetch<T>(path: string): Promise<T> {
  const apiKey = mustGetEnv("OPENSEA_API_KEY");

  const res = await fetch(`${OPENSEA_BASE}${path}`, {
    headers: {
      "accept": "application/json",
      "x-api-key": apiKey,
    },
    // caching handled at route-level; keep this default here
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenSea error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
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



// lib/chains.ts
export const CHAIN_ICON: Record<string, string> = {
  ethereum: "/chains/ethereum.svg",
  base: "/chains/base.svg",
  polygon: "/chains/polygon.svg",
  arbitrum: "/chains/arbitrum.svg",
  optimism: "/chains/optimism.svg",
  zora: "/chains/zora.svg",
};


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
