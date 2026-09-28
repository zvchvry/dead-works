import { NextRequest, NextResponse } from "next/server";
import seed from "@/data/sudoswap-pools.json";
import { client } from "@/lib/sudoswap";
import { discoverPoolPage, type PoolIndex } from "@/lib/sudoswap-discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const pages = new Map<string, { expires: number; value: Promise<PoolIndex> }>();
let head: { expires: number; value: Promise<number> } | null = null;

export async function GET(request: NextRequest) {
  try {
    if (!head || head.expires <= Date.now()) head = { expires: Date.now() + 60000, value: client.getBlock({ blockTag: "finalized" }).then(block => Number(block.number)) };
    const finalized = await head.value;
    const after = Number(request.nextUrl.searchParams.get("after") ?? seed.throughBlock);
    const target = Number(request.nextUrl.searchParams.get("target") ?? finalized);
    if (!Number.isSafeInteger(after) || !Number.isSafeInteger(target) || after < seed.throughBlock || after > finalized || target < after || target > finalized) return NextResponse.json({ error: "Invalid pool-history range." }, { status: 400 });
    const key = `${after}:${target}`;
    let cached = pages.get(key);
    if (!cached || cached.expires <= Date.now()) {
      for (const [oldKey, item] of pages) if (item.expires <= Date.now()) pages.delete(oldKey);
      if (pages.size >= 20) pages.delete(pages.keys().next().value!);
      cached = { expires: Date.now() + 60000, value: after === target ? Promise.resolve({ throughBlock: after, pools: [] }) : discoverPoolPage(after + 1, target) };
      pages.set(key, cached);
      cached.value.catch(() => pages.delete(key));
    }
    const result = await cached.value;
    return NextResponse.json({ ...result, complete: result.throughBlock >= target, targetBlock: target }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    head = null;
    return NextResponse.json({ error: "Could not check for new pools. Showing the saved index; refresh to retry." }, { status: 503 });
  }
}
