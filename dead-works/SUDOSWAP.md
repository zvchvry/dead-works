# Based Ghouls / Sudoswap v1

The `/sudoswap` page defaults to the Based Ghouls ETH pool `0x2E5800bc3474DFEE44da5C4FB0E55dD4dC1C58b0` on Ethereum mainnet. The directory page does not link to it while it is under development. The `/sudoswap` route remains directly accessible.

The pool directory discovers every Based Ghouls v1 pool from factory `NewPair` events, then shows only pools with a positive live `balanceOf` for the collection. Empty pools and unverified balances are hidden. Pools are sorted by their live single-NFT ETH buy quote, including protocol and pool fees. Unquotable and ERC20 pools sort last. Search, direction filters, pagination, and ETH pool selection are supported; ERC20 pools are listed as view-only. Pool inventory refreshes after a trade or with Refresh pools.

Supported: injected Ethereum wallets, single-NFT buys and sells, pool inventory, collection artwork via tokenURI/IPFS, live quotes, selectable slippage, transaction simulation, receipt tracking, and individual token approvals. Users can paste another v1 Based Ghouls ETH pool or use `/sudoswap?pool=0x…`. This is a direct-pool interface, with no automatic best-price routing or pool creation.

Optional deployment configuration:

- `SUDOSWAP_V1_POOLS`: comma-separated featured pool addresses. First pool loads by default. Set at build time.
- `NEXT_PUBLIC_ETHEREUM_RPC_URL`: browser-accessible Ethereum mainnet RPC URL. Without it, dRPC and PublicNode are used. This value is public; do not put a private server credential in it.

Pool addresses are verified through the canonical v1 factory's `isPair` method for the two ETH variants, then checked against the Based Ghouls collection contract. Quotes expire after 60 seconds; buy limits round up and sell limits round down. Gas is additional. A sale needing approval requires a new quote and confirmation after the individual token approval is mined. Wallet/account changes invalidate the quote.

Validation: `npm run test:sudoswap` (Node 22.6+), `npx tsc --noEmit`, `npm run build`. The targeted tests cover rounding, token IDs, and pool identity checks. Wallet signing and actual mainnet transactions require manual validation; no funded transaction was submitted during development.

Contract references:
- https://sudoswap.github.io/lssvm-docs/site/reference/contracts/
- https://github.com/sudoswap/lssvm/blob/main/src/LSSVMPair.sol
- https://github.com/sudoswap/lssvm/blob/main/src/LSSVMPairFactory.sol

Pool discovery uses public Routescan event logs, with Blockscout as a fallback, and checks each pool’s collection on Ethereum. `data/sudoswap-pools.json` is the saved historical index. Run `npm run index:sudoswap` to rebuild or resume it (Node 22.6+ and network access required). The `/api/sudoswap/pools` endpoint checks new finalized blocks, supports stateless continuation across server restarts, deduplicates overlapping pages, and never advances past a failed read. The browser keeps the saved list on discovery errors and displays a freshness warning. Discovery uses no third-party API keys.

The Sell Ghouls tab now loads the connected wallet's inventory instead of accepting a typed token ID. Incoming transfer history is paginated through the public index and each candidate's `ownerOf` is checked at the same block as `balanceOf`. The gallery is displayed only when its count matches the on-chain balance. Wallet changes discard the old gallery and selection; completed trades refresh wallet inventory. A Refresh wallet control retries index lag or errors.

`data/tainted-ghouls.json` contains the 23 Ethereum Based Ghouls token IDs from the supplied `tainted.csv`. Red Tainted badges appear on matching buy/sell cards and the selected trade summary. Matching uses chain, collection address, and the on-chain token ID (not the artwork's metadata edition number). These labels reflect the supplied list and do not block trading. To update the list, replace the matching IDs in this data file.
