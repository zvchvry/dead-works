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

// lib/opensea.ts
export async function getRandomCollectionImage(slug: string) {
  const data = await openseaFetch<{
    nfts?: Array<{ image_url?: string; display_image_url?: string }>;
  }>(`/collection/${encodeURIComponent(slug)}/nfts?limit=50`);

  const nfts = (data.nfts ?? [])
    .map((n) => n.image_url || n.display_image_url)
    .filter(Boolean) as string[];

  if (nfts.length === 0) return null;

  const idx = Math.floor(Math.random() * nfts.length);
  return nfts[idx];
}

export function openseaCollectionUrl(slug: string) {
  return `https://opensea.io/collection/${slug}`;
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
