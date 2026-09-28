"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import GhoulCard from "@/components/GhoulCard";
import { loadWalletGhouls } from "@/lib/ghoul-wallet";
import { short } from "@/lib/sudoswap";

export default function WalletGhouls({ account, selected, disabled, onSelect, onConnect }: {
  account: Address | null; selected: bigint | null; disabled: boolean;
  onSelect: (id: bigint | null) => void; onConnect: () => void;
}) {
  const [ids, setIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(!!account);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!account) return;
    const abort = new AbortController();
    loadWalletGhouls(account, abort.signal).then(result => {
      if (!abort.signal.aborted) setIds(result);
    }).catch(error => {
      if (!abort.signal.aborted) setError(error instanceof Error ? error.message : "Could not load your Ghouls.");
    }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [account, refresh]);
  if (!account) return <div className="sudo-empty"><h2>Your Ghouls, ready to trade.</h2><p>Connect your Ethereum wallet to choose a Ghoul to sell.</p><button className="sudo-primary" disabled={disabled} onClick={onConnect}>Connect wallet ↗</button></div>;
  const shown = ids.filter(id => id.toString().includes(search.trim()));
  return <div>
    <div className="sudo-wallet-toolbar"><span>{short(account)} · {loading ? "Loading Ghouls…" : error ? "Inventory unavailable" : `${ids.length} Ghouls`}</span><button disabled={disabled || loading} onClick={() => { onSelect(null); setLoading(true); setError(""); setIds([]); setRefresh(value => value + 1); }}>Refresh wallet ↻</button></div>
    {loading ? <div className="sudo-empty" role="status"><h2>Finding your Ghouls…</h2><p>Checking your wallet’s current on-chain ownership.</p></div>
      : error ? <div className="sudo-empty"><p className="sudo-error" role="alert">{error}</p></div>
      : !ids.length ? <div className="sudo-empty"><h2>No Based Ghouls in this wallet</h2><p>Switch wallets or refresh after receiving a Ghoul.</p></div>
      : <><div className="sudo-inventory-header"><span>Select a Ghoul to sell</span><input aria-label="Search your Ghouls by token ID" placeholder="Search token ID…" value={search} onChange={event => setSearch(event.target.value)} /></div><div className="sudo-nfts">{shown.map(id => <GhoulCard key={id.toString()} id={id} selected={selected === id} disabled={disabled} onSelect={() => onSelect(selected === id ? null : id)} />)}</div>{!shown.length && <p className="sudo-art-note">No Ghouls match that token ID.</p>}<p className="sudo-art-note">Select one Ghoul per sale. Tainted labels identify entries in the supplied list.</p></>}
  </div>;
}
