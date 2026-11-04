import type { Metadata } from "next";
import Link from "next/link";
import KineticText from "@/components/KineticText";
import RollingText from "@/components/RollingText";
import NeuralPrompt from "@/components/NeuralPrompt";
import ReadingText from "@/components/ReadingText";
import ProjectPlayground from "@/components/ProjectPlayground";
import SignalJourney from "@/components/SignalJourney";
import { projects } from "@/data/projects";
import CoreInteraction from "@/components/CoreInteraction";
import CoreIgnition from "@/components/CoreIgnition";
import Preloader from "@/components/Preloader";
import NextPage from "@/components/NextPage";
import SocialLinks from "@/components/SocialLinks";
import Artwork from "@/components/Artwork";
import {
  about,
  education,
  experience,
  profile,
  recognition,
  research,
} from "@/data/profile";
import LocalTime from "@/components/LocalTime";
import AskPanel from "@/components/AskPanel";
import Toolkit from "@/components/Toolkit";
import { askEnabled } from "@/lib/ask-config";

const featured = [
  {
    slug: "mygym",
    name: "MyGym",
    category: "THE GYM. CONNECTED.",
    description:
      "One member. One journey. One system for everything in between.",
    number: "01",
    tag: "FULL-STACK PLATFORM",
    year: "2026",
  },
  {
    slug: "vanicert",
    name: "VaniCert",
    category: "LISTEN BEYOND THE VOICE.",
    description:
      "Exploring voice authenticity through neural analysis and signal processing.",
    number: "02",
    tag: "APPLIED AI · AUDIO",
    year: "",
  },
  {
    slug: "firstdrop-ai",
    name: "FirstDropAI",
    category: "PRACTICE THE HUMAN PART.",
    description:
      "A place for doctors to rehearse the conversations that matter.",
    number: "03",
    tag: "CONVERSATIONAL AI",
    year: "2026",
  },
  {
    slug: "bhashabuddy",
    name: "BhashaBuddy",
    category: "A LITTLE CLOSER TO HOME.",
    description:
      "Stories, speech, and play. A connection to the language of your family.",
    number: "04",
    tag: "LANGUAGE · LEARNING",
    year: "",
  },
] as const;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "Shubhang Srinivas Varda — Full-Stack & AI Engineer",
    description:
      "Full-stack products, applied AI, and thoughtful digital experiences.",
    url: "/",
  },
};
export default function Home() {
  return (
    <main id="main">
      <Preloader />
      <section className="hero">
        <div className="hero-topline">
          <p className="hero-name">
            Shubhang <span>Srinivas Varda</span>
          </p>
          <span className="eyebrow location">
            <i /> <LocalTime />
          </span>
        </div>
        <h1 tabIndex={-1} aria-label="Software with an AI core.">
          <span className="hero-line">
            <span className="hero-line-inner" data-glow="Software with">
              <span className="hero-plain">Software with</span>
            </span>
          </span>
          <span className="hero-line">
            <span className="hero-line-inner" data-glow="an AI core.">
              <span className="hero-plain">an </span>
              <span>AI core.</span>
            </span>
          </span>
        </h1>
        <div className="hero-art" data-scene="hero">
          <Artwork scene="hero" />
        </div>
        <NeuralPrompt />
        <CoreInteraction />
        <div className="hero-bottom">
          <p>
            Full-Stack & AI Engineer.
            <br />
            <span>
              From complex problems
              <br className="mobile-br" /> to things people use.
            </span>
          </p>
          <a
            className="round-link"
            href="#selected-work"
            aria-label="Explore selected work"
          >
            <span>Explore the work</span>
            <b>↓</b>
          </a>
        </div>
        <div className="hero-foot eyebrow">
          <SocialLinks />
          <CoreIgnition />
        </div>
      </section>
      <section
        className="selected"
        id="selected-work"
        aria-labelledby="work-heading"
      >
        <div className="section-heading">
          <span className="eyebrow">01 / SELECTED WORK</span>
          <h2 id="work-heading">
            Ideas, made real<span>.</span>
          </h2>
          <p>
            Different problems.
            <br />
            The same instinct to build.
          </p>
        </div>
        {featured.map((p) => (
          <article
            className={`project project-${p.slug}`}
            key={p.slug}
            data-scene={p.slug}
            data-cursor="view"
          >
            <div className="project-top eyebrow">
              <span>
                {p.number} / {p.tag}
              </span>
              <span>{p.year || "SELECTED PROJECT"}</span>
            </div>
            <div className="project-art">
              <Artwork scene={p.slug} />
            </div>
            <Link
              href={`/work/${p.slug}`}
              className="project-hit-area"
              aria-hidden="true"
              tabIndex={-1}
            />
            <div className="project-heading">
              <p className="eyebrow">{p.category}</p>
              <h3>
                <Link href={`/work/${p.slug}`}>
                  <KineticText text={p.name} />
                  <span className="sr-only"> case study</span>
                </Link>
              </h3>
            </div>
            <div className="project-bottom">
              <p>{p.description}</p>
              <Link className="project-cta" href={`/work/${p.slug}`}>
                <RollingText text="View case study" /> <span>↗</span>
              </Link>
            </div>
            <span className="art-caption">SYSTEM STUDY / {p.number}</span>
          </article>
        ))}
        <Link className="all-work" href="/work">
          <span>There’s more to the story.</span>
          <span>
            <RollingText text="All work" /> <sup>05</sup> ↗
          </span>
        </Link>
      </section>
      <section className="about section-pad" id="about">
        <div className="discipline-band" aria-hidden="true">
          <div>ENGINEERING · INTELLIGENCE · INTERACTION ·</div>
          <div>IDEAS INTO SYSTEMS · SYSTEMS INTO IMPACT ·</div>
        </div>
        <span className="eyebrow">02 / THE PERSON BEHIND THE SYSTEMS</span>
        <div className="about-main">
          <h2>
            Curious by nature.
            <br />
            Engineer by <em>instinct.</em>
          </h2>
          <div className="about-copy">
            <p>
              <ReadingText text={about.intro} />
            </p>
            <p>{about.body}</p>
            <p className="small-copy">
              {education.degree}
              <br />
              {education.school} · {education.status}
            </p>
          </div>
        </div>
        <div className="personal-line">
          <span className="eyebrow">AWAY FROM THE EDITOR</span>
          <p>{about.personal}</p>
        </div>
      </section>
      <section className="research section-pad" id="research">
        <span className="eyebrow">03 / THINKING BEYOND THE BUILD</span>
        <div className="research-grid">
          <div>
            <span className="research-mark">∴</span>
            <p className="eyebrow">
              PEER-REVIEWED / {research.journal}
              <br />
              SPRINGER NATURE · MARCH 2026
            </p>
          </div>
          <div>
            <h2>
              What if imperfection
              <br />
              is part of the system?
            </h2>
            <p className="paper-title">{research.title}</p>
            <p>{research.summary}</p>
            <a
              className="text-link"
              href={research.url}
              target="_blank"
              rel="noreferrer"
            >
              Read the paper <span>↗</span>
            </a>
          </div>
        </div>
      </section>
      <section className="experience section-pad" id="experience">
        <div className="section-heading compact">
          <span className="eyebrow">04 / IN PRACTICE</span>
          <h2>Experience.</h2>
        </div>
        {experience.map((job) => (
          <div className="experience-row" key={job.organisation}>
            <span className="eyebrow">{job.dates}</span>
            <div>
              <h3>{job.organisation}</h3>
              <span>{job.role}</span>
            </div>
            <p>{job.summary}</p>
          </div>
        ))}
        <div className="recognition">
          <span className="eyebrow">ALSO ALONG THE WAY</span>
          {recognition.map((item) => (
            <p key={item.title}>
              {item.title}
              <br />
              <span>{item.detail}</span>
            </p>
          ))}
        </div>
      </section>
      <Toolkit />
      <ProjectPlayground
        projects={projects.map(
          ({ slug, title, category, summary, number }) => ({
            slug,
            title,
            category,
            summary,
            number,
          }),
        )}
      />
      <SignalJourney />
      <section className="contact section-pad" id="contact">
        <span className="eyebrow">
          <i /> OPEN TO GOOD CONVERSATIONS
        </span>
        <h2>
          Let’s build
          <br />
          something
          <br />
          <a href={`mailto:${profile.email}`}>
            <KineticText text="worth using." />
            <span className="contact-arrow">↗</span>
          </a>
        </h2>
        <div className="contact-bottom">
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
          <SocialLinks />
        </div>
        {askEnabled() && (
          <div className="contact-ask">
            <div className="contact-ask-copy">
              <p className="eyebrow">NOT READY TO WRITE? ASK THE CORE.</p>
              <p>Questions about the work, answered from this site.</p>
            </div>
            <AskPanel variant="inline" />
          </div>
        )}
      </section>
      <footer className="footer">
        <span>© {new Date().getFullYear()} SHUBHANG SRINIVAS VARDA</span>
        <span>DESIGNED & ENGINEERED WITH INTENT.</span>
        <a href="#main">
          <RollingText text="BACK TO TOP" /> ↑
        </a>
      </footer>
      <NextPage
        href="/work"
        eyebrow="THERE’S MORE TO THE STORY"
        title="All work"
      />
    </main>
  );
}
