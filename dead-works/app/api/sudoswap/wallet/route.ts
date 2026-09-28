import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { COLLECTION } from "@/lib/sudoswap";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const owner = request.nextUrl.searchParams.get("owner") ?? "";
  const page = Number(request.nextUrl.searchParams.get("page"));
  const end = Number(request.nextUrl.searchParams.get("end"));
  if (!isAddress(owner) || !Number.isSafeInteger(page) || page < 1 || page > 100 || !Number.isSafeInteger(end) || end < 1) return NextResponse.json({ error: "Invalid wallet inventory request." }, { status: 400 });
  for (const endpoint of ["https://api.routescan.io/v2/network/mainnet/evm/1/etherscan/api", "https://eth.blockscout.com/api"]) {
    try {
      const url = new URL(endpoint);
      url.search = new URLSearchParams({ module: "account", action: "tokennfttx", contractaddress: COLLECTION, address: owner, page: String(page), offset: "100", sort: "desc", startblock: "0", endblock: String(end) }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
      if (!response.ok) continue;
      const body = await response.json();
      if (!Array.isArray(body.result) || (body.status !== "1" && body.message !== "No transactions found" && body.message !== "No records found")) continue;
      // Only incoming transfers for this collection are ownership candidates.
      // The browser verifies ownerOf for every candidate at a fixed block.
      const ids: string[] = [];
      for (const row of body.result) {
        if (typeof row.contractAddress !== "string" || typeof row.to !== "string" || typeof row.tokenID !== "string") throw new Error("Malformed inventory response");
        if (row.contractAddress.toLowerCase() === COLLECTION.toLowerCase() && row.to.toLowerCase() === owner.toLowerCase() && /^\d+$/.test(row.tokenID) && BigInt(row.tokenID) < 2n ** 256n) ids.push(BigInt(row.tokenID).toString());
      }
      return NextResponse.json({ ids: [...new Set(ids)], hasMore: body.result.length === 100 }, { headers: { "Cache-Control": "no-store" } });
    } catch { /* Try the alternate index without claiming the wallet is empty. */ }
  }
  return NextResponse.json({ error: "Wallet inventory is temporarily unavailable. Please retry." }, { status: 503 });
}
