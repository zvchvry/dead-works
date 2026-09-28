import entries from "../data/tainted-ghouls.json" with { type: "json" };

const tokenIds = new Set(entries.tokenIds);
export function isTainted(chain: string, collection: string, tokenId: bigint) {
  return chain.toLowerCase() === entries.chain && collection.toLowerCase() === entries.collection && tokenIds.has(tokenId.toString());
}
