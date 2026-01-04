import Link from "next/link";
import { CHAIN_ICON } from "@/lib/opensea";
import { openseaCollectionUrl } from "@/lib/opensea";

type Props = {
  title: string;
  image: string | null;
  floor: number | null;
  symbol: string | null;
  chain: string;
  collectionSlug: string;
};

export function ProjectCard({
  title,
  image,
  floor,
  symbol,
  chain,
  collectionSlug,
}: Props) {
  const href = openseaCollectionUrl(collectionSlug);
  const chainIcon = CHAIN_ICON[chain];

  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group block"
    >
      <div
        className={[
          "relative overflow-hidden rounded-xl",
          "border border-white/10 bg-black/20",
          "shadow-sm transition-all duration-200",
          "hover:-translate-y-1 hover:shadow-lg",
          "hover:scale-[1.02]", // expand slightly
          "max-w-[300px]",      // <= card size cap
        ].join(" ")}
      >
        {/* Title top bar */}
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

        {/* Floor bottom-left overlay */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
          {chainIcon ? (
            <img
              src={chainIcon}
              alt={chain}
              className="h-4 w-4 opacity-90"
              loading="lazy"
            />
          ) : null}

          <span>
            {floor == null ? "—" : `${floor} ${symbol ?? ""}`.trim()}
          </span>
        </div>

        {/* Subtle hover ring */}
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/0 transition group-hover:ring-white/15" />
      </div>
    </Link>
  );
}
