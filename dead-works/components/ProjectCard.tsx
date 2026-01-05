"use client";

import { useEffect, useState } from "react";
import { CHAIN_ICON } from "@/lib/chains";
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOpen(true)}
      onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      className="project-card-button"
    >
      <div className="project-card">
        <div className="project-card-title">{title}</div>

        <div className="project-card-image-wrap">
          <img
  src={image ?? "/imgs/SKULL-ROTATE.gif"}
  onError={(e) => {
    (e.currentTarget as HTMLImageElement).src = "/imgs/SKULL-ROTATE.gif";
  }}
            alt={title}
            className="project-card-image"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="project-card-floor">
          {chainIcon && (
            <img
              src={chainIcon}
              alt={chain}
              className="project-card-chain-icon"
              loading="lazy"
            />
          )}
          <span>
            {floor == null
              ? "—"
              : `${formatPrice(floor)} ${symbol ?? ""}`.trim()}
          </span>
        </div>

        {/* CARD-ONLY overlay */}
        {open && (
          <div className="project-card-overlay" role="dialog" aria-modal="true">
            {/* backdrop */}
            <div
              className="project-card-backdrop"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />

            <div
              className="project-card-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="project-card-modal-title">
                Open {title} on…
              </div>

              <div className="project-card-modal-actions">
                <a
                  href={osUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="project-card-link"
                  onClick={() => setOpen(false)}
                >
                  OpenSea
                </a>

                <a
                  href={sudoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="project-card-link"
                  onClick={() => setOpen(false)}
                >
                  Sudoswap
                </a>

                <div
                  role="button"
                  tabIndex={0}
                  className="project-card-cancel"
                  onClick={() => setOpen(false)}
                  onKeyDown={(e) => e.key === "Enter" && setOpen(false)}
                >
                  Cancel
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
