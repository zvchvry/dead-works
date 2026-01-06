import { ProjectGrid } from "@/components/ProjectGrid";
import { Typewriter } from "@/components/Typewriter";

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 font-bold italic">[ dead.works ]</h1>

      <Typewriter
        text={">a list of 𝕲𝖍𝖔𝖚𝖑𝖘 projects and derivatives\n>can't kill what's already dead"}
        speed={28}
      />

      <ProjectGrid />
    </main>
  );
}
