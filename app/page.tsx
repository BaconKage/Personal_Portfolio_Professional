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
import { profile, research } from "@/data/profile";

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
          <p className="hero-name">Shubhang <span>Srinivas Varda</span></p>
          <span className="eyebrow location">
            <i /> BENGALURU, INDIA
          </span>
        </div>
        <h1 tabIndex={-1} aria-label="Software with an AI core.">
          <span className="hero-line">
            <span className="hero-line-inner">Software with</span>
          </span>
          <span className="hero-line">
            <span className="hero-line-inner">
              an <span>AI core.</span>
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
            <Link href={`/work/${p.slug}`} className="project-hit-area" aria-hidden="true" tabIndex={-1} />
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
        <div className="discipline-band" aria-hidden="true"><div>ENGINEERING · INTELLIGENCE · INTERACTION ·</div><div>IDEAS INTO SYSTEMS · SYSTEMS INTO IMPACT ·</div></div>
        <span className="eyebrow">02 / THE PERSON BEHIND THE SYSTEMS</span>
        <div className="about-main">
          <h2>
            Curious by nature.
            <br />
            Engineer by <em>instinct.</em>
          </h2>
          <div className="about-copy">
            <p>
              <ReadingText text="I’m Shubhang. I work where applied AI meets the everyday reality of building software: the data, the interface, and the things that can go wrong between them." />
            </p>
            <p>
              That takes me from gym operations to clinical conversations, voice
              analysis, and language learning. Different domains. A shared
              interest in making complex systems useful.
            </p>
            <p className="small-copy">
              B.Tech CSE · Data Science & Engineering
              <br />
              RV University, Bengaluru · Expected 2027
            </p>
          </div>
        </div>
        <div className="personal-line">
          <span className="eyebrow">AWAY FROM THE EDITOR</span>
          <p>
            Founder of RV University’s Model UN Society. A room full of
            different perspectives is a good place to learn how to defend a
            decision.
          </p>
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
            <p>
              Our paper examines AI’s limitations through complexity, ethics,
              and governance. It informs how I think about building systems that
              remain useful without pretending to be infallible.
            </p>
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
      <section className="experience section-pad">
        <div className="section-heading compact">
          <span className="eyebrow">04 / IN PRACTICE</span>
          <h2>Experience.</h2>
        </div>
        <div className="experience-row">
          <span className="eyebrow">JUN 2026 — PRESENT</span>
          <div>
            <h3>First Drop Theatre</h3>
            <span>Technology Consultant</span>
          </div>
          <p>
            Scenario generation, conversational simulation, voice interaction,
            and feedback reports for clinical communication training.
          </p>
        </div>
        <div className="experience-row">
          <span className="eyebrow">MAR 2025 — PRESENT</span>
          <div>
            <h3>Catalyst To BeActive</h3>
            <span>Full-Stack Developer</span>
          </div>
          <p>
            Gym software, member and trainer workspaces, computer vision for
            workout validation, and AI-assisted diet planning.
          </p>
        </div>
        <div className="recognition">
          <span className="eyebrow">ALSO ALONG THE WAY</span>
          <p>
            INNOVATEX ’26 · 2nd place
            <br />
            <span>RV University × Dell Technologies</span>
          </p>
          <p>
            NPTEL · Affective Computing
            <br />
            <span>Elite certificate · 91%</span>
          </p>
          <p>
            AWS Academy
            <br />
            <span>Data Engineering</span>
          </p>
        </div>
      </section>
      <ProjectPlayground projects={projects.map(({ slug, title, category, summary, number }) => ({ slug, title, category, summary, number }))} />
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
            <KineticText text="worth using." /><span className="contact-arrow">↗</span>
          </a>
        </h2>
        <div className="contact-bottom">
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
          <SocialLinks />
        </div>
      </section>
      <footer className="footer">
        <span>© {new Date().getFullYear()} SHUBHANG SRINIVAS VARDA</span>
        <span>DESIGNED & ENGINEERED WITH INTENT.</span>
        <a href="#main">
          <RollingText text="BACK TO TOP" /> ↑
        </a>
      </footer>
      <NextPage href="/work" eyebrow="THERE’S MORE TO THE STORY" title="All work" />
    </main>
  );
}
