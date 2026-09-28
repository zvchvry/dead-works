import type { Address } from "viem";
import { client, COLLECTION, nftAbi } from "./sudoswap.ts";

export async function loadWalletGhouls(owner: Address, signal: AbortSignal): Promise<bigint[]> {
  signal.throwIfAborted();
  const blockNumber = await client.getBlockNumber();
  const balance = await client.readContract({ address: COLLECTION, abi: nftAbi, functionName: "balanceOf", args: [owner], blockNumber });
  if (balance === 0n) return [];
  const owned = new Set<bigint>();
  const seen = new Set<string>();
  for (let page = 1; page <= 100; page++) {
    signal.throwIfAborted();
    const query = new URLSearchParams({ owner, page: String(page), end: blockNumber.toString() });
    const response = await fetch(`/api/sudoswap/wallet?${query}`, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("Wallet inventory is temporarily unavailable. Please retry.");
    const result: { ids: string[]; hasMore: boolean } = await response.json();
    const ids = result.ids.filter(id => !seen.has(id));
    ids.forEach(id => seen.add(id));
    if (ids.length) {
      const owners = await client.multicall({ blockNumber, batchSize: 65536, contracts: ids.map(id => ({ address: COLLECTION, abi: nftAbi, functionName: "ownerOf" as const, args: [BigInt(id)] as const })) });
      owners.forEach((entry, i) => { if (entry.status === "success" && entry.result.toLowerCase() === owner.toLowerCase()) owned.add(BigInt(ids[i])); });
    }
    // Matching balanceOf proves every current NFT has been found, even if the
    // index has older pages left. Sold/transferred tokens are never included.
    if (BigInt(owned.size) === balance) return [...owned].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    if (!result.hasMore) break;
  }
  throw new Error("The ownership index has not caught up, or some ownership checks failed. Refresh to retry; no incomplete inventory is shown.");
}
