import { createPublicClient, fallback, http, parseAbi, formatEther, type Address } from "viem";
import { mainnet } from "viem/chains";

export const FACTORY = "0xb16c1342E617A5B6E4b631EB114483FDB289c0A4" as const;
export const COLLECTION = "0xef1a89cbfabe59397ffda11fc5df293e9bc5db90" as const;
export const V1_URL = `https://v1.sudoswap.xyz/#/browse/buy/${COLLECTION}`;
export const client = createPublicClient({
  chain: mainnet,
  transport: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL
    ? http(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL, { timeout: 12000, retryCount: 1 })
    : fallback([
        http("https://eth.drpc.org", { timeout: 10000, retryCount: 0 }),
        http("https://ethereum-rpc.publicnode.com", { timeout: 10000, retryCount: 0 }),
      ]),
});
export const pairAbi = parseAbi([
  "function nft() view returns (address)",
  "function pairVariant() view returns (uint8)",
  "function poolType() view returns (uint8)",
  "function fee() view returns (uint96)",
  "function getAllHeldIds() view returns (uint256[])",
  "function getBuyNFTQuote(uint256) view returns (uint8,uint256,uint256,uint256,uint256)",
  "function getSellNFTQuote(uint256) view returns (uint8,uint256,uint256,uint256,uint256)",
  "function swapTokenForSpecificNFTs(uint256[],uint256,address,bool,address) payable returns (uint256)",
  "function swapNFTsForToken(uint256[],uint256,address,bool,address) returns (uint256)",
]);
export const nftAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)",
  "function getApproved(uint256) view returns (address)",
  "function isApprovedForAll(address,address) view returns (bool)",
  "function approve(address,uint256)",
]);
const factoryAbi = parseAbi(["function isPair(address,uint8) view returns (bool)"]);
export type Pool = { address: Address; type: number; ids: readonly bigint[]; balance: bigint; fee: bigint };

export async function loadPool(address: Address): Promise<Pool> {
  // A pool's self-reported factory is not proof: verify its clone against the real factory.
  const variants = await Promise.all([0, 1].map(variant => client.readContract({
    address: FACTORY, abi: factoryAbi, functionName: "isPair", args: [address, variant],
  })));
  if (!variants.some(Boolean)) throw new Error("This is not a Sudoswap v1 ETH pool. Paste an individual pool address, not the factory.");
  const nft = await client.readContract({ address, abi: pairAbi, functionName: "nft" });
  if (nft.toLowerCase() !== COLLECTION.toLowerCase()) throw new Error("This pool does not trade Based Ghouls.");
  const [type, ids, balance, fee] = await Promise.all([
    client.readContract({ address, abi: pairAbi, functionName: "poolType" }),
    client.readContract({ address, abi: pairAbi, functionName: "getAllHeldIds" }),
    client.getBalance({ address }),
    client.readContract({ address, abi: pairAbi, functionName: "fee" }),
  ]);
  return { address, type, ids, balance, fee };
}

export function price(value: bigint) {
  const [whole, fraction] = formatEther(value).split(".");
  return fraction ? `${whole}.${fraction.slice(0, 6)}` : whole;
}
export function short(value: string) { return `${value.slice(0, 6)}…${value.slice(-4)}`; }
export function tradeLimit(amount: bigint, buying: boolean, bps: bigint) {
  return buying ? (amount * (10000n + bps) + 9999n) / 10000n : amount * (10000n - bps) / 10000n;
}
export function parseTokenId(value: string): bigint | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const id = BigInt(value.trim());
  return id < 2n ** 256n ? id : null;
}

export function hasGhouls(count: string | null | undefined) {
  return typeof count === "string" && /^\d+$/.test(count) && BigInt(count) > 0n;
}

export function comparePoolBuyPrices(
  a: { address: string; variant: number; type: number },
  b: { address: string; variant: number; type: number },
  quotes: Record<string, string | null>,
) {
  const priceFor = (pool: typeof a) => pool.variant < 2 && pool.type !== 0 && quotes[pool.address] != null ? BigInt(quotes[pool.address]!) : null;
  const left = priceFor(a); const right = priceFor(b);
  if (left === null && right !== null) return 1;
  if (left !== null && right === null) return -1;
  if (left !== null && right !== null && left !== right) return left < right ? -1 : 1;
  return a.address.toLowerCase().localeCompare(b.address.toLowerCase());
}
