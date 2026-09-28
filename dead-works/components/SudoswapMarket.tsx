"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import GhoulCard, { TaintedLabel } from "@/components/GhoulCard";
import WalletGhouls from "@/components/WalletGhouls";
import SudoswapPools from "@/components/SudoswapPools";
import type { PoolIndex } from "@/lib/sudoswap-discovery";
import { createWalletClient, custom, formatEther, isAddress, zeroAddress, type Address, type EIP1193Provider, type Hash } from "viem";
import { mainnet } from "viem/chains";
import { COLLECTION, FACTORY, V1_URL, client, loadPool, nftAbi, pairAbi, price, short, tradeLimit, type Pool } from "@/lib/sudoswap";

type Provider = EIP1193Provider & { on?: (event: string, listener: (...args: unknown[]) => void) => void; removeListener?: (event: string, listener: (...args: unknown[]) => void) => void };
type Quote = { amount: bigint; limit: bigint; id: bigint; pool: Address; mode: "buy" | "sell"; expires: number };
function provider() { return (window as Window & { ethereum?: Provider }).ethereum; }
function message(error: unknown) {
  if (error && typeof error === "object" && "code" in error && error.code === 4001) return "Request cancelled in your wallet.";
  if (error && typeof error === "object" && "shortMessage" in error) return String(error.shortMessage);
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export default function SudoswapMarket({ featuredPools, initialIndex }: { featuredPools: string[]; initialIndex: PoolIndex }) {
  const [poolInput, setPoolInput] = useState(featuredPools[0] ?? "");
  const [pool, setPool] = useState<Pool | null>(null);
  const [account, setAccount] = useState<Address | null>(null);
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [selected, setSelected] = useState<bigint | null>(null);
  const [sellId, setSellId] = useState<bigint | null>(null);
  const [walletRevision, setWalletRevision] = useState(0);
  const [filter, setFilter] = useState("");
  const [slippage, setSlippage] = useState("50");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [tx, setTx] = useState<Hash | null>(null);
  const [now, setNow] = useState(0);
  const context = useRef(0);
  const loadVersion = useRef(0);
  const initialPool = useRef(featuredPools[0]);
  const tradePanel = useRef<HTMLDivElement>(null);
  const activeId = mode === "buy" ? selected : sellId;
  const allowed = pool && (mode === "buy" ? pool.type !== 0 : pool.type !== 1);

  async function openPool(value: string) {
    const version = ++loadVersion.current;
    context.current++;
    setQuote(null); setSelected(null); setSellId(null); setPool(null); setError(""); setStatus("");
    if (!isAddress(value)) { setError("Enter a valid Ethereum pool address."); setLoading(false); return; }
    setLoading(true);
    try {
      const result = await loadPool(value);
      if (version === loadVersion.current) setPool(result);
    } catch (e) { if (version === loadVersion.current) setError(message(e)); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("pool");
    const address = query ?? initialPool.current;
    if (address) { setPoolInput(address); void openPool(address); } else setLoading(false);
    const loadCounter = loadVersion;
    const contextCounter = context;
    const eth = provider();
    const changed = () => { context.current++; setAccount(null); setSellId(null); setQuote(null); setStatus("Wallet changed. Connect again to continue."); };
    eth?.on?.("accountsChanged", changed); eth?.on?.("chainChanged", changed);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { loadCounter.current++; contextCounter.current++; clearInterval(timer); eth?.removeListener?.("accountsChanged", changed); eth?.removeListener?.("chainChanged", changed); };
  }, []);

  function resetQuote() { context.current++; setQuote(null); setError(""); setStatus(""); }
  async function connect() {
    setBusy("Connecting wallet…"); setError("");
    try {
      const eth = provider();
      if (!eth) throw new Error("Open this page in an Ethereum wallet browser, or install a browser wallet to trade.");
      const wallet = createWalletClient({ chain: mainnet, transport: custom(eth) });
      if (await wallet.getChainId() !== 1) await wallet.switchChain({ id: 1 });
      const [address] = await wallet.requestAddresses();
      if (!address) throw new Error("No wallet account was selected.");
      setAccount(address); setSellId(null); setQuote(null); context.current++;
    } catch (e) { setError(message(e)); } finally { setBusy(""); }
  }

  async function getQuote() {
    if (!pool || activeId === null || !allowed) return;
    const version = context.current;
    setBusy("Getting live quote…"); setError(""); setQuote(null); setStatus("");
    try {
      if (mode === "sell") {
        if (!account) throw new Error("Connect your wallet before quoting a sale.");
        const owner = await client.readContract({ address: COLLECTION, abi: nftAbi, functionName: "ownerOf", args: [activeId] });
        if (owner.toLowerCase() !== account.toLowerCase()) throw new Error("Your connected wallet does not own this Ghoul.");
      }
      const result = await client.readContract({ address: pool.address, abi: pairAbi, functionName: mode === "buy" ? "getBuyNFTQuote" : "getSellNFTQuote", args: [1n] });
      if (result[0] !== 0 || result[3] === 0n) throw new Error("This pool cannot quote this trade right now.");
      if (mode === "sell" && result[3] + result[4] > await client.getBalance({ address: pool.address })) throw new Error("This pool does not have enough ETH for this sale.");
      if (version === context.current) {
        const time = Date.now(); setNow(time);
        setQuote({ amount: result[3], limit: tradeLimit(result[3], mode === "buy", BigInt(slippage)), id: activeId, pool: pool.address, mode, expires: time + 60000 });
      }
    } catch (e) { if (version === context.current) setError(message(e)); } finally { setBusy(""); }
  }

  async function execute() {
    if (!quote || !account || quote.expires <= Date.now()) return;
    const reviewed = quote;
    const version = context.current;
    setBusy("Checking trade…"); setError(""); setStatus(""); setTx(null);
    try {
      const eth = provider();
      if (!eth) throw new Error("Your wallet is unavailable. Please reconnect.");
      const wallet = createWalletClient({ chain: mainnet, transport: custom(eth) });
      async function checkWallet() {
        const [current] = await wallet.getAddresses();
        if (await wallet.getChainId() !== 1 || current?.toLowerCase() !== account!.toLowerCase() || version !== context.current) throw new Error("Wallet or trade changed. Reconnect and get a new quote.");
      }
      await checkWallet();
      await loadPool(reviewed.pool);
      if (reviewed.mode === "sell") {
        const [approved, all] = await Promise.all([
          client.readContract({ address: COLLECTION, abi: nftAbi, functionName: "getApproved", args: [reviewed.id] }),
          client.readContract({ address: COLLECTION, abi: nftAbi, functionName: "isApprovedForAll", args: [account, reviewed.pool] }),
        ]);
        if (!all && approved.toLowerCase() !== reviewed.pool.toLowerCase()) {
          setBusy("Approve this Ghoul in your wallet…");
          const approval = await client.simulateContract({ address: COLLECTION, abi: nftAbi, functionName: "approve", args: [reviewed.pool, reviewed.id], account });
          await checkWallet();
          const hash = await wallet.writeContract(approval.request); setTx(hash);
          setBusy("Waiting for approval…");
          const receipt = await client.waitForTransactionReceipt({ hash });
          if (receipt.status !== "success") throw new Error("Approval failed on-chain.");
          setQuote(null); setStatus("Ghoul approved for this pool. Get a fresh quote to review and confirm the sale.");
          return;
        }
      }
      await checkWallet();
      if (reviewed.expires <= Date.now()) throw new Error("Quote expired. Get a fresh quote before trading.");
      const args = [[reviewed.id], reviewed.limit, account, false, zeroAddress] as const;
      // Simulate with the exact reviewed bound; a price move outside it reverts.
      const simulation = reviewed.mode === "buy"
        ? await client.simulateContract({ address: reviewed.pool, abi: pairAbi, functionName: "swapTokenForSpecificNFTs", args, value: reviewed.limit, account })
        : await client.simulateContract({ address: reviewed.pool, abi: pairAbi, functionName: "swapNFTsForToken", args, account });
      await checkWallet();
      if (reviewed.expires <= Date.now()) throw new Error("Quote expired. Get a fresh quote before trading.");
      setBusy("Confirm trade in your wallet…");
      const hash = simulation.request.functionName === "swapTokenForSpecificNFTs"
        ? await wallet.writeContract(simulation.request)
        : await wallet.writeContract(simulation.request); setTx(hash); setQuote(null);
      setBusy("Waiting for confirmation…");
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Trade reverted on-chain. No swap was completed.");
      setSelected(null); setSellId(null); setWalletRevision(value => value + 1);
      setStatus(reviewed.mode === "buy" ? `Based Ghoul #${reviewed.id} is yours.` : `Based Ghoul #${reviewed.id} sold.`);
      try { setPool(await loadPool(reviewed.pool)); } catch { setPool(null); setStatus("Trade confirmed. Reload the pool to update balances."); }
    } catch (e) { setError(message(e)); setQuote(null); } finally { setBusy(""); }
  }

  const shownIds = pool?.ids.filter(id => id.toString().includes(filter)) ?? [];
  return (
    <main className="sudo-page">
      <header className="sudo-header">
        <Link href="/" className="sudo-wordmark">[ dead.works ]</Link>
        <div className="sudo-header-actions"><span className="sudo-network"><i /> Ethereum</span><button disabled={!!busy} onClick={connect}>{account ? short(account) : "Connect wallet ↗"}</button></div>
      </header>
      <nav className="sudo-breadcrumb"><Link href="/">the directory</Link><span>/</span><span>sudoswap v1</span></nav>
      <section className="sudo-hero">
        <div><div className="sudo-eyebrow">THE DEAD STILL TRADE <span> / SUDO V1</span></div><h1>Ghouls exchange</h1><p>A little liquidity for the afterlife.<br />Buy & sell Based Ghouls on Sudoswap v1.</p><a href={`https://etherscan.io/address/${COLLECTION}`} target="_blank" rel="noreferrer" className="sudo-collection-link">Based Ghouls · {short(COLLECTION)} ↗</a></div>
      </section>
      <section className="sudo-stats" aria-label="Selected pool statistics">
        <div><span>COLLECTION</span><strong>Based Ghouls</strong></div><div><span>GHOULS IN POOL</span><strong>{pool ? pool.ids.length : "—"}</strong></div><div><span>POOL BALANCE</span><strong>{pool ? price(pool.balance) : "—"} <small>ETH</small></strong></div><div><span>POOL FEE</span><strong>{pool ? `${Number(formatEther(pool.fee)) * 100}%` : "—"}</strong></div>
      </section>
      <SudoswapPools refreshKey={pool ? `${pool.address}:${pool.ids.length}` : ""} initialIndex={initialIndex} selected={pool?.address} disabled={!!busy || loading} onSelect={address => { setPoolInput(address); void openPool(address); tradePanel.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
      <div className="sudo-layout" ref={tradePanel}>
        <section className="sudo-market">
          <div className="sudo-toolbar"><div className="sudo-tabs" role="tablist" aria-label="Trade direction">{(["buy", "sell"] as const).map(tab => <button key={tab} role="tab" aria-selected={mode === tab} disabled={!!busy} onClick={() => { resetQuote(); setMode(tab); }}>{tab === "buy" ? "Buy Ghouls" : "Sell Ghouls"}</button>)}</div><span className="sudo-version">V1 / ETH</span></div>
          <div className="sudo-pool-picker">
            <label htmlFor="pool-address">Pool address</label>
            <form onSubmit={e => { e.preventDefault(); void openPool(poolInput.trim()); }}><input id="pool-address" value={poolInput} onChange={e => setPoolInput(e.target.value)} placeholder="0x…" spellCheck={false} disabled={!!busy || loading} /><button disabled={!!busy || loading} type="submit">{loading ? "Loading…" : "Load pool ↗"}</button></form>
            {featuredPools.length > 1 && <div className="sudo-featured">{featuredPools.map(address => <button key={address} disabled={!!busy || loading} onClick={() => { setPoolInput(address); void openPool(address); }}>{short(address)}</button>)}</div>}
            {pool && <div className="sudo-pool-caption"><span>✓ Verified v1 · {(["Buys NFTs", "Sells NFTs", "Two-way pool"])[pool.type]}</span><a href={`https://etherscan.io/address/${pool.address}`} target="_blank" rel="noreferrer">View pool ↗</a></div>}
          </div>
          {loading ? <div className="sudo-empty" role="status"><span className="sudo-empty-symbol">⟳</span><h2>Waking the dead…</h2><p>Checking the pool and reading its inventory from Ethereum.</p></div>
            : !pool ? <div className="sudo-empty"><span className="sudo-empty-symbol">†</span><h2>A home for your Ghouls</h2><p>Load a Based Ghouls v1 pool to see its inventory and get a live quote.</p><a href={V1_URL} target="_blank" rel="noreferrer">Explore on Sudoswap v1 ↗</a></div>
            : !allowed ? <div className="sudo-empty"><h2>{mode === "buy" ? "This pool only buys Ghouls" : "This pool only sells Ghouls"}</h2><p>Switch tabs or load another pool to continue.</p></div>
            : mode === "sell" ? <WalletGhouls key={`${account ?? "disconnected"}:${walletRevision}`} account={account} selected={sellId} disabled={!!busy} onSelect={id => { resetQuote(); setSellId(id); }} onConnect={connect} />
            : <><div className="sudo-inventory-header"><span>{pool.ids.length} Ghouls available</span><input aria-label="Filter by token ID" placeholder="Search token ID…" value={filter} onChange={e => setFilter(e.target.value)} /></div>{shownIds.length ? <div className="sudo-nfts">{shownIds.map(id => <GhoulCard key={id.toString()} id={id} selected={selected === id} disabled={!!busy} onSelect={() => { resetQuote(); setSelected(selected === id ? null : id); }} />)}</div> : <div className="sudo-empty"><h2>{pool.ids.length ? "No matching Ghouls" : "No Ghouls in this pool"}</h2><p>{pool.ids.length ? "Try another token ID." : "Load another pool or come back later."}</p></div>}<p className="sudo-art-note">Artwork loads from collection metadata. Token IDs remain visible if images are unavailable.</p></>}
        </section>
        <aside className="sudo-order">
          <div className="sudo-order-title"><h2>Your trade</h2><span>↗</span></div>
          <div className="sudo-order-body"><div className="sudo-order-selection"><span>{mode === "buy" ? "YOU RECEIVE" : "YOU SELL"}</span><strong>{activeId !== null ? `Ghoul #${activeId}` : "One more for the crypt"}</strong><div className="sudo-order-tainted">{activeId !== null && <TaintedLabel id={activeId} />}</div><p>{activeId !== null ? "1 × Based Ghouls" : mode === "buy" ? "Select a Ghoul to get started." : "Select a Ghoul from your wallet."}</p></div>
            <label className="sudo-slippage" htmlFor="slippage">Slippage tolerance<select id="slippage" value={slippage} disabled={!!busy} onChange={e => { resetQuote(); setSlippage(e.target.value); }}><option value="10">0.1%</option><option value="50">0.5%</option><option value="100">1%</option></select></label>
            <div className="sudo-total"><span>{mode === "buy" ? "Quoted cost" : "Quoted proceeds"}</span><strong>{quote ? price(quote.amount) : "—"} ETH</strong></div>
            {quote && <div className="sudo-quote-detail"><div>{mode === "buy" ? "Maximum payment" : "Minimum received"}<strong>{formatEther(quote.limit)} ETH</strong></div><p>{quote.expires > now ? `Quote expires in ${Math.ceil((quote.expires - now) / 1000)}s` : "Quote expired. Refresh to continue."}</p></div>}
            <p className="sudo-fine">Pool and protocol fees are included in the quote. Network gas is extra.</p>
            {!account && (mode === "sell" || activeId === null || quote) ? <button className="sudo-primary" disabled={!!busy} onClick={connect}>Connect wallet ↗</button> : quote && quote.expires > now ? <button className="sudo-primary" disabled={!!busy} onClick={execute}>{mode === "buy" ? "Confirm purchase" : "Approve / confirm sale"} ↗</button> : <button className="sudo-primary" disabled={!!busy || loading || !allowed || activeId === null} onClick={getQuote}>Get {mode === "buy" ? "buy" : "sell"} quote ↗</button>}
            {quote && <button className="sudo-refresh" disabled={!!busy} onClick={getQuote}>Refresh quote</button>}
            <div aria-live="polite">{busy && <p className="sudo-notice">{busy}</p>}{status && <p className="sudo-notice">{status}</p>}{error && <p className="sudo-error" role="alert">{error}</p>}{tx && <a className="sudo-tx" href={`https://etherscan.io/tx/${tx}`} target="_blank" rel="noreferrer">View transaction {short(tx)} ↗</a>}</div>
          </div><div className="sudo-order-foot">DIRECT FROM THE POOL. TO YOUR WALLET.</div>
        </aside>
      </div>
      <footer className="sudo-footer"><span>/can’t kill what’s already dead</span><div><a href={`https://etherscan.io/address/${FACTORY}#code`} target="_blank" rel="noreferrer">V1 factory ↗</a><a href={V1_URL} target="_blank" rel="noreferrer">Sudoswap v1 ↗</a></div></footer>
    </main>
  );
}
