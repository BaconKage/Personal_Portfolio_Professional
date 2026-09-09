"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
const Graphics = dynamic(() => import("@/components/canvas/Graphics"), {
  ssr: false,
});

export default function Motion() {
  const path = usePathname();
  const [graphics, setGraphics] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [preference, setPreference] = useState("system");
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = (event?: Event) => {
      let preference = "system";
      try {
        preference = localStorage.getItem("portfolio-motion") || "system";
      } catch {}
      if (event instanceof CustomEvent) preference = event.detail;
      setPreference(preference);
      const off = media.matches || preference === "reduced";
      setReduced(off);
      document.documentElement.dataset.motion = off ? "reduced" : "system";
      setGraphics(!off);
    };
    update();
    media.addEventListener("change", update);
    window.addEventListener("motion-change", update);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("motion-change", update);
    };
  }, []);
  useEffect(() => {
    if (reduced) return;
    let dispose = () => {};
    let cancelled = false;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        const ctx = gsap.context(() => {
          gsap.utils
            .toArray<HTMLElement>(
              ".section-heading h2,.about h2,.research h2,.case-context h2",
            )
            .forEach((el) => {
              gsap.from(el, {
                y: 28,
                duration: 0.7,
                ease: "power3.out",
                scrollTrigger: { trigger: el, start: "top 94%", once: true },
              });
            });
          if (innerWidth >= 768) {
            document.querySelectorAll<HTMLElement>(".project").forEach((el) => {
              const heading = el.querySelector(".project-heading");
              gsap.fromTo(
                heading,
                { y: 35 },
                {
                  y: -25,
                  ease: "none",
                  scrollTrigger: {
                    trigger: el,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.5,
                  },
                },
              );
            });
          }
          const titles = document.querySelectorAll(
            ".case-intro h1,.index-heading h1",
          );
          if (titles.length)
            gsap.fromTo(
              titles,
              { y: 18 },
              { y: 0, duration: 0.55, ease: "power3.out" },
            );
        });
        dispose = () => ctx.revert();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      dispose();
    };
  }, [path, reduced]);
  return (
    <>
      {graphics && <Graphics />}
      <div className="motion-setting">
        <label htmlFor="motion-mode">Motion</label>
        <select
          id="motion-mode"
          aria-label="Motion preference"
          value={preference}
          onChange={(e) => {
            try {
              localStorage.setItem("portfolio-motion", e.target.value);
            } catch {}
            window.dispatchEvent(
              new CustomEvent("motion-change", { detail: e.target.value }),
            );
          }}
        >
          <option value="system">System</option>
          <option value="reduced">Reduced</option>
        </select>
      </div>
    </>
  );
}
