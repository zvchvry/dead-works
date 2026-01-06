"use client";

import { useEffect, useState } from "react";
import { ProjectCard } from "./ProjectCard";

type ApiProject = {
  key: string;
  title: string;
  image: string | null;
  floor: number | null;
  symbol: string | null;
  chain: string;
  collectionSlug: string;
  contractAddress: string;
};

export function ProjectGrid() {
  const [projects, setProjects] = useState<ApiProject[]>([]);

  async function load() {
    try {
      const res = await fetch("/api/floors", { cache: "no-store" });
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (e) {
      console.error("Failed to load floors", e);
    }
  }

  useEffect(() => {
    load(); // ✅ only once per page load
  }, []);

  return (
<div className="grid grid-cols-4 gap-4 pt-[7px] max-md:grid-cols-2">
      {projects.map((p) => (
        <ProjectCard
          key={p.key}
          title={p.title}
          image={p.image}
          floor={p.floor}
          symbol={p.symbol}
          chain={p.chain}
          collectionSlug={p.collectionSlug}
          contractAddress={p.contractAddress}
        />
      ))}
    </div>
  );
}
