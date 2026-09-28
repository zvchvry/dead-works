import { isAddress, parseAbi, type Address } from "viem";
import { client, COLLECTION, FACTORY } from "./sudoswap.ts";

export const FACTORY_DEPLOYMENT = 14645816;
export const NEW_PAIR_TOPIC = "0xf5bdc103c3e68a20d5f97d2d46792d3fdddfa4efeb6761f8141e6a7b936ca66c";
export type DiscoveredPool = { address: Address; variant: number; type: number };
export type PoolIndex = { throughBlock: number; pools: DiscoveredPool[] };
type FactoryLog = { address: string; blockNumber: string; data: string; topics: (string | null)[] };
const identityAbi = parseAbi([
  "function nft() view returns (address)",
  "function pairVariant() view returns (uint8)",
  "function poolType() view returns (uint8)",
]);

export function parseFactoryPage(logs: FactoryLog[], from: number, to: number) {
  if (!Array.isArray(logs)) throw new Error("Invalid factory event response.");
  const addresses = new Set<Address>();
  let lastBlock = from;
  for (const log of logs) {
    const block = Number(BigInt(log.blockNumber));
    if (log.address.toLowerCase() !== FACTORY.toLowerCase() || log.topics[0] !== NEW_PAIR_TOPIC || block < from || block > to || !/^0x[0-9a-fA-F]{64}$/.test(log.data)) throw new Error("Invalid factory event.");
    const address = `0x${log.data.slice(-40)}`;
    if (!isAddress(address)) throw new Error("Invalid pool address in factory event.");
    addresses.add(address);
    lastBlock = Math.max(lastBlock, block);
  }
  // The event indexes cap log responses at 1,000. Re-read the boundary block so pools
  // created in the same block cannot be skipped when a page cuts through it.
  const throughBlock = logs.length >= 1000 ? lastBlock - 1 : to;
  if (throughBlock < from) throw new Error("Factory log page cannot advance safely.");
  return { addresses: [...addresses], throughBlock };
}

export async function discoverPoolPage(from: number, to: number): Promise<PoolIndex> {
  let page: ReturnType<typeof parseFactoryPage> | undefined;
  for (const endpoint of ["https://api.routescan.io/v2/network/mainnet/evm/1/etherscan/api", "https://eth.blockscout.com/api"]) {
    try {
      const url = new URL(endpoint);
      url.search = new URLSearchParams({ module: "logs", action: "getLogs", address: FACTORY, topic0: NEW_PAIR_TOPIC, fromBlock: String(from), toBlock: String(to), page: "1", offset: "1000" }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
      if (!response.ok) continue;
      const body = await response.json();
      if (!Array.isArray(body.result) || (body.status !== "1" && body.message !== "No logs found" && body.message !== "No records found")) continue;
      page = parseFactoryPage(body.result, from, to);
      break;
    } catch { /* Try the independent event index; never advance on a failed page. */ }
  }
  if (!page) throw new Error("Pool history is temporarily unavailable. Please retry.");
  const pools: DiscoveredPool[] = [];
  for (let offset = 0; offset < page.addresses.length; offset += 500) {
    const addresses = page.addresses.slice(offset, offset + 500);
    const collections = await client.multicall({ batchSize: 65536, contracts: addresses.map(address => ({ address, abi: identityAbi, functionName: "nft" as const })) });
    if (collections.some(result => result.status === "failure")) throw new Error("Some pools could not be checked. Retry to complete discovery.");
    const matches = addresses.filter((_, i) => collections[i].result?.toLowerCase() === COLLECTION.toLowerCase());
    if (!matches.length) continue;
    const details = await client.multicall({ contracts: matches.flatMap(address => [
      { address, abi: identityAbi, functionName: "pairVariant" as const },
      { address, abi: identityAbi, functionName: "poolType" as const },
    ]) });
    for (let i = 0; i < matches.length; i++) {
      const variant = details[i * 2]; const type = details[i * 2 + 1];
      if (variant.status !== "success" || type.status !== "success") throw new Error("Pool details could not be checked. Please retry.");
      pools.push({ address: matches[i], variant: Number(variant.result), type: Number(type.result) });
    }
  }
  return { throughBlock: page.throughBlock, pools };
}

export function mergePoolIndex(previous: PoolIndex, next: PoolIndex): PoolIndex {
  const pools = new Map(previous.pools.map(pool => [pool.address.toLowerCase(), pool]));
  for (const pool of next.pools) pools.set(pool.address.toLowerCase(), pool);
  return { throughBlock: Math.max(previous.throughBlock, next.throughBlock), pools: [...pools.values()] };
}
