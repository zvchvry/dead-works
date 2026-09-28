"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { client, COLLECTION, nftAbi, pairAbi, short, hasGhouls, price, comparePoolBuyPrices } from "@/lib/sudoswap";
import type { Address } from "viem";
import type { PoolIndex } from "@/lib/sudoswap-discovery";

type DiscoveryResponse = PoolIndex & { complete: boolean; targetBlock: number; warning?: string };
const PAGE_SIZE = 12;

export default function SudoswapPools({ initialIndex, selected, disabled, refreshKey, onSelect }: {
  initialIndex: PoolIndex;
  selected?: string;
  disabled: boolean;
  refreshKey: string;
  onSelect: (address: Address) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const progress = useRef(initialIndex);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [discovering, setDiscovering] = useState(true);
  const [warning, setWarning] = useState("");
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState(false);
  const [buyPrices, setBuyPrices] = useState<Record<string, string | null>>({});
  const [counts, setCounts] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const abort = new AbortController();
    async function sync() {
      setDiscovering(true); setWarning("");
      try {
        let complete = false;
        let target: number | undefined;
        while (!complete && !abort.signal.aborted) {
          const query = new URLSearchParams({ after: String(progress.current.throughBlock), ...(target ? { target: String(target) } : {}) });
          const response = await fetch(`/api/sudoswap/pools?${query}`, { signal: abort.signal, cache: "no-store" });
          if (!response.ok) throw new Error("Pool discovery is unavailable. Retry to update the saved list.");
          const result: DiscoveryResponse = await response.json();
          if (abort.signal.aborted) return;
          if (result.throughBlock < progress.current.throughBlock || (!result.complete && result.throughBlock === progress.current.throughBlock)) throw new Error("Pool discovery did not advance. Please refresh to retry.");
          const pools = new Map(progress.current.pools.map(pool => [pool.address.toLowerCase(), pool]));
          result.pools.forEach(pool => pools.set(pool.address.toLowerCase(), pool));
          const next = { throughBlock: result.throughBlock, pools: [...pools.values()] };
          progress.current = next;
          setIndex(next);
          target = result.targetBlock;
          if (result.warning) { setWarning(result.warning); break; }
          complete = result.complete;
        }
      } catch (error) {
        if (!abort.signal.aborted) setWarning(error instanceof Error ? error.message : "Pool discovery failed. Please retry.");
      } finally { if (!abort.signal.aborted) setDiscovering(false); }
    }
    void sync();
    return () => abort.abort();
  }, [refresh]);

  const stocked = useMemo(() => index.pools.filter(pool => hasGhouls(counts[pool.address])).sort((a, b) => comparePoolBuyPrices(a, b, buyPrices)), [index.pools, counts, buyPrices]);
  const filtered = useMemo(() => stocked.filter(pool =>
    pool.address.toLowerCase().includes(search.trim().toLowerCase()) &&
    (kind === "all" || (kind === "buy" && pool.type !== 0) || (kind === "sell" && pool.type !== 1) || (kind === "erc20" && pool.variant >= 2))
  ), [stocked, kind, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visible = useMemo(() => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE), [filtered, currentPage]);

  useEffect(() => {
    let stopped = false;
    async function inventory() {
      setInventoryLoading(true); setInventoryError(false);
      const next: Record<string, string | null> = {};
      let failed = false;
      for (let offset = 0; offset < index.pools.length; offset += 150) {
        const batch = index.pools.slice(offset, offset + 150);
        if (stopped) return;
        try {
          const results = await client.multicall({ batchSize: 65536, contracts: batch.map(pool => ({ address: COLLECTION, abi: nftAbi, functionName: "balanceOf" as const, args: [pool.address] as const })) });
          batch.forEach((pool, i) => {
            next[pool.address] = results[i].status === "success" ? String(results[i].result) : null;
            if (results[i].status !== "success") failed = true;
          });
        } catch { failed = true; batch.forEach(pool => { next[pool.address] = null; }); }
      }
      const prices: Record<string, string | null> = {};
      const buyable = index.pools.filter(pool => pool.variant < 2 && pool.type !== 0 && hasGhouls(next[pool.address]));
      for (let offset = 0; offset < buyable.length; offset += 150) {
        const batch = buyable.slice(offset, offset + 150);
        if (stopped) return;
        try {
          const results = await client.multicall({ batchSize: 65536, contracts: batch.map(pool => ({ address: pool.address, abi: pairAbi, functionName: "getBuyNFTQuote" as const, args: [1n] as const })) });
          batch.forEach((pool, i) => {
            const result = results[i];
            prices[pool.address] = result.status === "success" && result.result[0] === 0 && result.result[3] > 0n ? String(result.result[3]) : null;
          });
        } catch { batch.forEach(pool => { prices[pool.address] = null; }); }
      }
      if (!stopped) { setCounts(next); setBuyPrices(prices); setInventoryError(failed); setInventoryLoading(false); }
    }
    void inventory();
    return () => { stopped = true; };
  }, [index.pools, refresh, refreshKey]);

  return <section className="sudo-directory" aria-label="Based Ghouls pools with NFTs">
    <div className="sudo-directory-heading"><div><div className="sudo-eyebrow">FIND YOUR POOL</div><h2>Pools with Ghouls <span>{inventoryLoading ? "…" : stocked.length}</span></h2></div><button disabled={discovering || inventoryLoading} onClick={() => setRefresh(value => value + 1)}>{discovering || inventoryLoading ? "Checking pools…" : "Refresh pools ↻"}</button></div>
    <p className="sudo-directory-description">Only pools currently holding Based Ghouls, sorted by the lowest buy price first. Prices include pool and protocol fees; gas is extra.</p>
    <div className="sudo-directory-filters"><input aria-label="Search pools by address" placeholder="Search pool address…" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /><select aria-label="Filter pools" value={kind} onChange={event => { setKind(event.target.value); setPage(0); }}><option value="all">All pools</option><option value="buy">Pools that sell Ghouls</option><option value="sell">Pools that buy Ghouls</option><option value="erc20">ERC20 pools</option></select></div>
    <div className="sudo-pool-list">{visible.map(pool => <div className={`sudo-pool-row ${selected?.toLowerCase() === pool.address.toLowerCase() ? "is-current" : ""}`} key={pool.address}>
      <div><a href={`https://etherscan.io/address/${pool.address}`} target="_blank" rel="noreferrer" title={pool.address}>{short(pool.address)} ↗</a><span>{["Buys Ghouls", "Sells Ghouls", "Two-way pool"][pool.type]} · {pool.variant < 2 ? "ETH" : "ERC20"}</span></div>
      <div className="sudo-pool-price"><strong>{buyPrices[pool.address] != null ? `${price(BigInt(buyPrices[pool.address]!))} ETH` : "—"}</strong><span>{pool.variant >= 2 ? "ERC20 pool" : buyPrices[pool.address] != null ? "Buy 1 Ghoul" : "No buy quote"}</span></div>
      <div className="sudo-pool-count"><strong>{counts[pool.address] ?? "—"}</strong><span>Ghouls held</span></div>
      {pool.variant < 2 ? <button aria-label={`Select pool ${pool.address}`} aria-pressed={selected?.toLowerCase() === pool.address.toLowerCase()} disabled={disabled} onClick={() => onSelect(pool.address)}>{selected?.toLowerCase() === pool.address.toLowerCase() ? "Selected ✓" : "Trade ↗"}</button> : <span className="sudo-pool-readonly">View only</span>}
    </div>)}</div>
    {!visible.length && <p className="sudo-directory-description">{inventoryLoading || discovering ? "Checking pool inventories…" : inventoryError ? "Could not verify pool inventories. Please refresh to retry." : stocked.length ? "No stocked pools match these filters." : "No pools in the indexed history currently hold Based Ghouls."}</p>}
    <div className="sudo-directory-bottom"><span>{filtered.length} pools · page {currentPage + 1} of {pages}</span><div><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>← Previous</button><button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next →</button></div></div>
    <p className="sudo-index-status" aria-live="polite">{warning || inventoryError ? warning || "Some inventory checks failed. Only pools confirmed to hold Ghouls are shown; refresh to retry." : `${discovering ? "Checking for new pools. " : ""}Indexed through Ethereum block ${index.throughBlock.toLocaleString("en-US")}. Empty pools are hidden. Pools without an ETH buy quote appear last; ERC20 pools are view-only.`}</p>
  </section>;
}
