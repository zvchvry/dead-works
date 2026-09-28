import type { Metadata } from "next";
import SudoswapMarket from "@/components/SudoswapMarket";
import "./sudoswap.css";
import poolIndex from "@/data/sudoswap-pools.json";
import type { PoolIndex } from "@/lib/sudoswap-discovery";

export const metadata: Metadata = {
  title: "Based Ghouls · Sudoswap v1 | dead.works",
  description: "Trade Based Ghouls through Ethereum Sudoswap v1 pools on dead.works.",
};

export default function SudoswapPage() {
  const pools = (process.env.SUDOSWAP_V1_POOLS ?? "0x2E5800bc3474DFEE44da5C4FB0E55dD4dC1C58b0").split(",").map(s => s.trim()).filter(Boolean);
  return <SudoswapMarket featuredPools={pools} initialIndex={poolIndex as PoolIndex} />;
}
