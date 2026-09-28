"use client";

import GhoulArtwork from "@/components/GhoulArtwork";
import { COLLECTION } from "@/lib/sudoswap";
import { isTainted } from "@/lib/tainted-ghouls";

export function TaintedLabel({ id }: { id: bigint }) {
  return isTainted("ethereum", COLLECTION, id) ? <span className="sudo-tainted" title="Listed in the supplied tainted.csv for this collection and token ID">Tainted</span> : null;
}

export default function GhoulCard({ id, selected, disabled, onSelect }: {
  id: bigint; selected: boolean; disabled: boolean; onSelect: () => void;
}) {
  return <button className={`sudo-nft ${selected ? "is-selected" : ""}`} disabled={disabled} aria-pressed={selected} onClick={onSelect}>
    <div className="sudo-token-art"><GhoulArtwork id={id} /><small>#{id.toString()}</small><span className="sudo-check">{selected ? "✓" : "+"}</span><TaintedLabel id={id} /></div>
    <div className="sudo-token-label"><strong>Based Ghoul</strong><span>#{id.toString()}</span></div>
  </button>;
}
