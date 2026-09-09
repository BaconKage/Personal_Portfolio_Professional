import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Artwork from "@/components/Artwork";
import Footer from "@/components/Footer";
import SceneControls from "@/components/SceneControls";
import SystemDiagram from "@/components/SystemDiagram";
import { projects, getProject } from "@/data/projects";
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  return p
    ? {
        title: p.title,
        description: p.summary,
        alternates: { canonical: `/work/${p.slug}` },
        openGraph: {
          title: p.title,
          description: p.summary,
          url: `/work/${p.slug}`,
        },
        twitter: {
          card: "summary_large_image",
          title: p.title,
          description: p.summary,
        },
      }
    : {};
}
export default async function CaseStudy({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();
  const next = projects[(projects.indexOf(p) + 1) % projects.length];
  return (
    <>
      <main id="main" className={`case-study case-${p.slug}`}>
        <div className="case-breadcrumb">
          <Link href="/work">← All work</Link>
          <span className="eyebrow">
            {p.number} / {p.category}
          </span>
        </div>
        <section className="case-intro">
          <h1>{p.title}</h1>
          <div className="case-deck">
            <span className="eyebrow">{p.descriptor}</span>
            <p>{p.summary}</p>
          </div>
        </section>
        <div className={`case-visual project-${p.slug}`} data-scene={p.slug}>
          <Artwork scene={p.slug} eager />
          <span className="eyebrow illustration-label">
            CONCEPTUAL SYSTEM STUDY / {p.number}
          </span>
        </div>
        <SceneControls id={p.slug} />
        <section className="case-overview">
          <div>
            <span className="eyebrow">ROLE</span>
            <p>{p.role}</p>
          </div>
          {p.team && (
            <div>
              <span className="eyebrow">COLLABORATION</span>
              <p>{p.team}</p>
            </div>
          )}
          <div>
            <span className="eyebrow">STATUS {p.year && `/ ${p.year}`}</span>
            <p>{p.status}</p>
          </div>
          {p.link && (
            <a
              className="text-link"
              href={p.link.url}
              target="_blank"
              rel="noreferrer"
            >
              {p.link.label} ↗
            </a>
          )}
        </section>
        <section className="case-context">
          <span className="eyebrow">01 / THE CONTEXT</span>
          <div>
            <h2>
              {p.hook.split("\n").map((line, i) => (
                <span key={line}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </h2>
            <p>{p.context}</p>
            <h3>The problem</h3>
            <p>{p.problem}</p>
          </div>
        </section>
        <section className="case-system">
          <div className="sticky-system">
            <span className="eyebrow">02 / INSIDE THE SYSTEM</span>
            <SystemDiagram {...p.diagram} />
            <div className="stack-list">
              {p.stack.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
          <div className="decisions">
            {p.decisions.map((d, i) => (
              <article key={d.title}>
                <span className="eyebrow">0{i + 1}</span>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="case-context contribution">
          <span className="eyebrow">03 / MY CONTRIBUTION</span>
          <div>
            <h2>Where I came in.</h2>
            <p>{p.contribution}</p>
            {p.slug === "mygym" && (
              <p className="context-note">
                Earlier MyGym work used React, Flutter, Flask, and MongoDB. That
                work is distinct from the current platform architecture
                described above.{" "}
                <Link href="/work/posture-engine">
                  Explore the posture and diet-planning work ↗
                </Link>
              </p>
            )}
          </div>
        </section>
        <section className="case-context">
          <span className="eyebrow">04 / THE CHALLENGE</span>
          <div>
            <h2>The useful complications.</h2>
            <p>{p.challenge}</p>
          </div>
        </section>
        <section className="case-context result">
          <span className="eyebrow">05 / WHERE IT STANDS</span>
          <div>
            <h2>The current state.</h2>
            <p>{p.result}</p>
            {p.link && (
              <a
                className="text-link"
                href={p.link.url}
                target="_blank"
                rel="noreferrer"
              >
                {p.link.label} <span>↗</span>
              </a>
            )}
          </div>
        </section>
        <Link
          href={`/work/${next.slug}`}
          className={`next-project project-${next.slug}`}
        >
          <div className="next-art">
            <Artwork scene={next.slug} />
          </div>
          <span className="eyebrow">KEEP EXPLORING / NEXT PROJECT</span>
          <h2>
            {next.title}
            <span>↗</span>
          </h2>
        </Link>
      </main>
      <Footer />
    </>
  );
}
