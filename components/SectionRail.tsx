"use client";
import { useEffect, useState } from "react";

const sections = [
  { id: "selected-work", label: "Work" },
  { id: "about", label: "About" },
  { id: "research", label: "Research" },
  { id: "experience", label: "Experience" },
  { id: "playground", label: "Playground" },
  { id: "contact", label: "Contact" },
];

/**
 * A long page needs a way to see where you are and to jump. A slim rail on
 * the left edge marks the section under the middle of the screen; hovering
 * it names every section and each one is a link. It steps aside for the
 * hero and the pinned signal scene, which are meant to fill the screen.
 */
export default function SectionRail() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const inView = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) inView.add(entry.target.id);
          else inView.delete(entry.target.id);
        // Sections are contiguous, so at most one crosses the middle line.
        setActive(sections.find((s) => inView.has(s.id))?.id ?? null);
      },
      // A zero-height band across the middle of the viewport.
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const { id } of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className="section-rail"
      aria-label="Sections"
      data-visible={active ? "true" : undefined}
      inert={!active}
    >
      {sections.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={active === id ? "true" : undefined}
        >
          <span className="rail-tick" aria-hidden="true" />
          <span className="rail-label">{label}</span>
        </a>
      ))}
    </nav>
  );
}
