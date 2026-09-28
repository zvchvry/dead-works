"use client";

import { useEffect, useRef, useState } from "react";
import { client, COLLECTION, nftAbi } from "@/lib/sudoswap";

function gateway(uri: string): string | null {
  if (uri.startsWith("ipfs://")) return `https://ipfs.filebase.io/ipfs/${uri.slice(7).replace(/^ipfs\//, "")}`;
  if (uri.startsWith("https://") || uri.startsWith("data:application/json") || uri.startsWith("data:image/")) return uri;
  return null;
}

export default function GhoulArtwork({ id }: { id: bigint }) {
  const element = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let stopped = false;
    const abort = new AbortController();
    const observer = new IntersectionObserver(async entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      try {
        const uri = await client.readContract({ address: COLLECTION, abi: nftAbi, functionName: "tokenURI", args: [id] });
        const url = gateway(uri);
        if (!url || stopped) return;
        const response = await fetch(url, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]) });
        if (!response.ok) return;
        const metadata = await response.json();
        if (!stopped && typeof metadata.image === "string") setImage(gateway(metadata.image));
      } catch { /* Metadata is optional; token IDs and trading remain available. */ }
    }, { rootMargin: "150px" });
    if (element.current) observer.observe(element.current);
    return () => { stopped = true; abort.abort(); observer.disconnect(); };
  }, [id]);
  return (
    <div className="sudo-artwork" ref={element}>
      {!loaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="sudo-artwork-placeholder" src="/imgs/SKULL-ROTATE.gif" alt="NFT artwork placeholder" />
      )}
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          alt={`Based Ghoul #${id}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => { setLoaded(false); setImage(null); }}
        />
      )}
    </div>
  );
}
