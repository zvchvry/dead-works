import { ProjectGrid } from "@/components/ProjectGrid";
import { Typewriter } from "@/components/Typewriter";
import Link from "next/link";
import "./directory.css";

export default function Page() {
  return (
    <main className="directory-page">
      <header className="directory-header">
        <Link href="/" className="directory-wordmark">[ dead.works ]</Link>
        <span className="directory-status"><i /> The directory</span>
      </header>
      <section className="directory-hero">
        <Typewriter
          text={">a list of 𝕲𝖍𝖔𝖚𝖑𝖘 projects and derivatives\n>can't kill what's already dead"}
          speed={28}
        />
      </section>
      <section aria-label="Collections" className="directory-collections">
      <div className="directory-section-heading"><h2>Collections</h2></div>
      <ProjectGrid />
      </section>


<footer className="directory-footer">
  <p>/i_love_you_ghouls</p>
  <Link
    href="https://maranasati.com"
    target="_blank"
    rel="noreferrer"
    className="footer-link"
  >maraṇasati.com
  </Link>
</footer>
    </main>
  );
}
