import { ProjectGrid } from "@/components/ProjectGrid";

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-bold">[ dead.works ]</h1>
      <p> &gt;a list of 𝕲𝖍𝖔𝖚𝖑𝖘 projects and derivatives</p>
      <p> &gt;can't kill what's already dead</p>
      <ProjectGrid />
    </main>
  );
}
