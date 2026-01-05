// app/api/floors/route.ts
import { NextResponse } from "next/server";
import { PROJECTS } from "@/data/projects";
import { getFloorBySlug, getCollectionImage } from "@/lib/opensea";

export const revalidate = 60;

export async function GET() {
  const results = await Promise.all(
    PROJECTS.map(async (p) => {
      try {
        const { floor, symbol } = await getFloorBySlug(p.collectionSlug);

        // NEW: use featured collection image
        const image = await getCollectionImage(p.collectionSlug);

        return {
          ...p,
          floor,
          symbol,
          image,
        };
      } catch {
        return {
          ...p,
          floor: null,
          symbol: null,
          image: null,
        };
      }
    })
  );

  results.sort((a, b) => (b.floor ?? -1) - (a.floor ?? -1));

  return NextResponse.json({ projects: results });
}
