import type { Metadata } from "next";
import Link from "next/link";
import Artwork from "@/components/Artwork";
import Footer from "@/components/Footer";
import { projects } from "@/data/projects";
export const metadata: Metadata = {
  title: "Selected work",
  alternates: { canonical: "/work" },
  openGraph: {
    title: "Selected work",
    url: "/work",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Shubhang Srinivas Varda — Selected work",
      },
    ],
    description: "Five projects across full-stack software and applied AI.",
  },
  description:
    "Five projects across full-stack platforms, voice authenticity, conversational AI, language learning, and computer vision.",
};
export default function Work() {
  return (
    <>
      <main id="main" className="work-index">
        <div className="index-heading">
          <span className="eyebrow">THE WORK / 2025 — 2026</span>
          <h1>
            Built around
            <br />
            <span>real problems.</span>
          </h1>
          <p>
            Five different systems.
            <br />A closer look at how they work.
          </p>
        </div>
        <div className="work-list">
          {projects.map((p) => (
            <Link
              className={`index-project index-${p.slug}`}
              href={`/work/${p.slug}`}
              key={p.slug}
            >
              <div className="index-art">
                <Artwork scene={p.slug} />
              </div>
              <div className="index-meta">
                <span className="eyebrow">
                  {p.number} / {p.category}
                </span>
                <h2>
                  {p.title}
                  <span>↗</span>
                </h2>
                <p>{p.descriptor}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
