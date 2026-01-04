"use client";

import { useEffect, useState } from "react";
import { CHAIN_ICON } from "@/lib/opensea";
import { openseaCollectionUrl, sudoswapBrowseUrl } from "@/lib/marketplaces";
import { formatPrice } from "@/lib/format";


type Props = {
  title: string;
  image: string | null;
  floor: number | null;
  symbol: string | null;
  chain: string;
  collectionSlug: string;
  contractAddress: string;
};

export function ProjectCard({
  title,
  image,
  floor,
  symbol,
  chain,
  collectionSlug,
  contractAddress,
}: Props) {
  const [open, setOpen] = useState(false);
  const chainIcon = CHAIN_ICON[chain];

  const osUrl = openseaCollectionUrl(collectionSlug);
  const sudoUrl = sudoswapBrowseUrl(chain, contractAddress);

  // close on ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* Card */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full max-w-[300px] text-left"
      >
        <div
          className="
            relative overflow-hidden rounded-xl
            border border-white/10 bg-black/20
            transition-all duration-200
            hover:-translate-y-1 hover:scale-[1.02]
          "
        >
          {/* Title INSIDE card, ABOVE image */}
          <div className="w-full bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            {title}
          </div>

          {/* Image */}
          <div className="aspect-square w-full">
            <img
              src={image ?? "/images/placeholder.png"}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Floor bottom-left */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            {chainIcon && (
              <img
                src={chainIcon}
                alt={chain}
                className="h-4 w-4 opacity-90"
                loading="lazy"
              />
            )}
                <span>
                {floor == null
                ? "—"
                : `${formatPrice(floor)} ${symbol ?? ""}`.trim()}
                </span>
          </div>
        </div>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <button
            aria-label="Close"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            type="button"
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-neutral-950/90 shadow-xl">
            <div className="px-4 py-3 text-sm font-semibold text-white/90">
              Open {title} on…
            </div>

            <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
              <a
                href={osUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                onClick={() => setOpen(false)}
              >
                OpenSea
              </a>

              <a
                href={sudoUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                onClick={() => setOpen(false)}
              >
                Sudoswap
              </a>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-1 rounded-lg px-4 py-2 text-sm font-medium text-white/60 hover:text-white/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
