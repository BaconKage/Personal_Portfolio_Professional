import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/**
 * Lenis already eases the scroll position. A long scrub on top of it is a
 * second, slower lag: parallax kept drifting for a second after the page had
 * stopped. A short one keeps the softness and stays attached to the scroll.
 */
const SCRUB = 0.28;

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+<>";
/**
 * Monospace labels decode into place: characters resolve left to right out
 * of cycling glyphs. Only text nodes are rewritten (same width per glyph in
 * a monospace face, so nothing reflows) and they are restored on cleanup.
 */
function decodeLabel(el: HTMLElement, cleanups: (() => void)[]) {
  const nodes: { node: Text; text: string; start: number }[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let total = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue || "";
    if (!text.trim()) continue;
    nodes.push({ node: node as Text, text, start: total });
    total += text.length;
  }
  if (!total) return;
  const restore = () => {
    for (const { node, text } of nodes)
      if (node.nodeValue !== text) node.nodeValue = text;
  };
  const state = { shown: 0 };
  let noise: string[] = [],
    bucket = -1;
  gsap.to(state, {
    shown: total,
    duration: gsap.utils.clamp(0.55, 1.15, 0.4 + total * 0.017),
    ease: "none",
    scrollTrigger: { trigger: el, start: "top 94%", once: true },
    onUpdate: () => {
      // Glyphs change every 45ms, not every frame: legible, and fewer writes.
      const now = Math.floor(performance.now() / 45);
      if (now !== bucket) {
        bucket = now;
        noise = Array.from(
          { length: total },
          () => GLYPHS[(Math.random() * GLYPHS.length) | 0],
        );
      }
      const shown = Math.floor(state.shown);
      for (const { node, text, start } of nodes) {
        let next = "";
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          next += start + i < shown || ch.trim() === "" ? ch : noise[start + i];
        }
        if (node.nodeValue !== next) node.nodeValue = next;
      }
    },
    onComplete: restore,
  });
  cleanups.push(restore);
}

/** All DOM animation is scoped and reversible when a route or motion preference changes. */
export function mountChoreography() {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const cleanups: (() => void)[] = [];
  const ctx = gsap.context(() => {
    const desktop = matchMedia("(min-width: 900px)").matches;
    const hero = document.querySelector<HTMLElement>(".hero");
    if (hero) {
      // CoreIgnition owns first-visit entry; scrolling owns only the exit.
      const exit = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: SCRUB,
          pin: false,
          pinSpacing: true,
          invalidateOnRefresh: true,
        },
      });
      exit
        .to(
          ".hero h1",
          {
            yPercent: -35,
            opacity: 0,
            scale: 0.88,
            transformOrigin: "left top",
          },
          0,
        )
        .to(
          ".hero-art",
          {
            scale: 1.06,
            yPercent: 0,
            borderRadius: 0,
            ease: "none",
          },
          0,
        );
    }
    document.querySelectorAll<HTMLElement>(".project").forEach((el, i) => {
      const title = el.querySelector(".project-heading");
      const radius = gsap.from(el, {
        borderRadius: desktop ? 110 : 32,
        scrollTrigger: {
          trigger: el,
          start: "top 95%",
          end: "top 12%",
          scrub: SCRUB,
        },
      });
      // Card copy arrives once the card has landed. With a WebGL sheet that
      // is the sheet's own (time-smoothed) landing, flagged as data-landed;
      // without one, it falls back to scroll position.
      const reveal = gsap.timeline({ paused: true });
      reveal
        .from(
          el.querySelectorAll(".kinetic-letter"),
          {
            yPercent: 115,
            rotationX: -70,
            stagger: 0.045,
            duration: 1.05,
            ease: "expo.out",
          },
          0,
        )
        .from(
          el.querySelectorAll(
            ".project-top,.project-bottom,.project-heading > p,.art-caption",
          ),
          { y: 40, opacity: 0, duration: 0.8, stagger: 0.12 },
          0.12,
        );
      const sheeted = () => document.documentElement.dataset.sheets === "on";
      const past = ScrollTrigger.create({
        trigger: el,
        start: "top 32%",
        onEnter: () => {
          if (!sheeted()) reveal.play();
        },
        onLeaveBack: () => {
          if (!sheeted()) reveal.reverse();
        },
      });
      // Once its WebGL sheet paints the card (corners included), the DOM card
      // is transparent: scrubbing its radius would only repaint it per frame.
      let rounding = true;
      const syncRadius = () => {
        const trigger = radius.scrollTrigger;
        const sheet = el.dataset.sheet === "true";
        if (!trigger || sheet !== rounding) return;
        rounding = !sheet;
        if (sheet) {
          trigger.disable(false);
          gsap.set(el, { clearProps: "borderRadius" });
        } else trigger.enable();
      };
      const land = () => {
        syncRadius();
        if (sheeted()) {
          if (el.dataset.landed === "true") reveal.play();
          else reveal.reverse();
        } else if (past.progress > 0 || past.isActive) reveal.play();
      };
      // Sheets can switch on after this mounts, or off if WebGL fails.
      const landing = new MutationObserver(land);
      landing.observe(el, {
        attributes: true,
        attributeFilter: ["data-landed", "data-sheet"],
      });
      landing.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-sheets"],
      });
      cleanups.push(() => landing.disconnect());
      if (sheeted()) land();
      gsap.fromTo(
        title,
        { xPercent: desktop ? (i % 2 ? 12 : -12) : 0, y: desktop ? 70 : 30 },
        {
          xPercent: 0,
          y: -30,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: SCRUB,
          },
        },
      );
    });
    // Headings and short copy rise line by line from behind a mask.
    // autoSplit re-splits after font loading and on resize.
    document
      .querySelectorAll<HTMLElement>(
        ".section-heading h2,.about h2,.research h2,.case-context h2,.experience h2,.section-heading > p,.personal-line p,.about-copy p:not(:first-child),.research-grid h2 ~ p:not(.paper-title)",
      )
      .forEach((el) => {
        const heading = el.tagName === "H2";
        const split = SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: heading ? 1.15 : 0.9,
              stagger: heading ? 0.09 : 0.06,
              ease: "expo.out",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            }),
        });
        cleanups.push(() => split.revert());
      });
    // Contact keeps a whole-block reveal: its rolling link must stay intact.
    document.querySelectorAll<HTMLElement>(".contact h2").forEach((el) => {
      gsap.from(el, {
        y: 75,
        clipPath: "inset(0 0 100% 0)",
        duration: 1.2,
        ease: "expo.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none reverse",
        },
      });
    });
    const caseTitles = document.querySelectorAll(
      ".case-intro h1,.index-heading h1",
    );
    const readingWords = document.querySelectorAll(".reading-word");
    const bands = document.querySelectorAll(".discipline-band > div");
    bands.forEach((el, i) =>
      gsap.fromTo(
        el,
        { xPercent: i ? -20 : 0 },
        {
          xPercent: i ? 0 : -20,
          ease: "none",
          scrollTrigger: {
            trigger: ".discipline-band",
            start: "top bottom",
            end: "bottom top",
            scrub: SCRUB,
          },
        },
      ),
    );
    const journey = document.querySelector(".signal-journey");
    if (journey) {
      const flight = gsap.timeline({
        scrollTrigger: {
          trigger: journey,
          start: "top top",
          end: "bottom bottom",
          scrub: SCRUB,
        },
      });
      flight
        .to(".signal-copy h2", { y: -55, opacity: 0, duration: 0.22 }, 0.34)
        .fromTo(
          ".signal-arrival",
          { y: 60, opacity: 0, scale: 0.88 },
          { y: 0, opacity: 1, scale: 1, duration: 0.22 },
          0.45,
        )
        .fromTo(
          ".signal-meter span",
          { scaleX: 0 },
          { scaleX: 1, duration: 1, ease: "none" },
          0,
        );
    }
    if (readingWords.length)
      gsap.fromTo(
        readingWords,
        { color: "#686a62" },
        {
          color: "#111315",
          stagger: 0.15,
          ease: "none",
          scrollTrigger: {
            trigger: ".about-copy",
            start: "top 82%",
            end: "top 35%",
            scrub: SCRUB,
          },
        },
      );
    if (document.querySelector(".research-mark"))
      gsap.fromTo(
        ".research-mark",
        { rotation: -28, scale: 0.7 },
        {
          rotation: 28,
          scale: 1.12,
          ease: "none",
          scrollTrigger: {
            trigger: ".research",
            start: "top bottom",
            end: "bottom top",
            scrub: SCRUB,
          },
        },
      );
    // Section labels decode as they arrive. Labels whose text React updates
    // (playground detail) or that sit inside other reveals are left alone.
    document.querySelectorAll<HTMLElement>("main .eyebrow").forEach((el) => {
      if (
        !el.closest(
          ".hero,.project,.next-page,.playground-detail,.case-visual,.preloader",
        )
      )
        decodeLabel(el, cleanups);
    });
    // Hairline rules draw themselves across instead of simply being there.
    document
      .querySelectorAll<HTMLElement>(
        ".personal-line,.experience-row,.recognition,.contact-bottom",
      )
      .forEach((el) => {
        el.classList.add("rule-draw");
        ScrollTrigger.create({
          trigger: el,
          start: "top 94%",
          once: true,
          onEnter: () => {
            el.dataset.drawn = "true";
          },
        });
        cleanups.push(() => {
          el.classList.remove("rule-draw");
          delete el.dataset.drawn;
        });
      });
    document.querySelectorAll(".experience-row").forEach((el) => {
      gsap.from(el.children, {
        y: 35,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });
    if (desktop && document.querySelector(".contact"))
      gsap.from(".contact", {
        borderRadius: "100px 100px 0 0",
        scale: 0.94,
        transformOrigin: "center bottom",
        scrollTrigger: {
          trigger: ".contact",
          start: "top 95%",
          end: "top 20%",
          scrub: SCRUB,
        },
      });
    if (caseTitles.length)
      gsap.from(caseTitles, {
        yPercent: 65,
        opacity: 0,
        duration: 1.1,
        ease: "expo.out",
      });
    document.querySelectorAll(".index-project").forEach((el) =>
      gsap.from(el, {
        y: 90,
        scale: 0.94,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      }),
    );
    if (desktop) {
      document
        .querySelectorAll<HTMLElement>(
          ".contact-pill,.round-link b,.project-cta,.menu-trigger,.float-pill",
        )
        .forEach((el) => {
          const x = gsap.quickTo(el, "x", {
              duration: 0.45,
              ease: "power3.out",
            }),
            y = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });
          // Measure once per hover (minus the current pull), not per move.
          let box = { cx: 0, cy: 0 };
          const enter = () => {
            const r = el.getBoundingClientRect();
            box = {
              cx: r.left + r.width / 2 - Number(gsap.getProperty(el, "x")),
              cy: r.top + r.height / 2 - Number(gsap.getProperty(el, "y")),
            };
          };
          const move = (e: PointerEvent) => {
            x((e.clientX - box.cx) * 0.18);
            y((e.clientY - box.cy) * 0.2);
          };
          const leave = () => {
            x(0);
            y(0);
          };
          el.addEventListener("pointerenter", enter);
          el.addEventListener("pointermove", move);
          el.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            el.removeEventListener("pointerenter", enter);
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerleave", leave);
            x.tween.kill();
            y.tween.kill();
            gsap.set(el, { clearProps: "transform" });
          });
        });
    }
    // Scrolling through the runway at the end of a page follows its link.
    // It arms only after the reader scrolls into it, never on arrival.
    document.querySelectorAll<HTMLElement>(".next-page").forEach((section) => {
      const link = section.querySelector<HTMLAnchorElement>("[data-next-page]");
      const ring = section.querySelector<SVGCircleElement>(
        ".next-page-ring circle:last-child",
      );
      if (!link) return;
      let armed = false,
        fired = false;
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          section.style.setProperty("--next", self.progress.toFixed(4));
          if (ring) ring.style.strokeDashoffset = String(1 - self.progress);
          if (self.progress < 0.92) {
            armed = true;
            fired = false;
          }
          if (armed && !fired && self.progress > 0.995 && self.direction > 0) {
            fired = true;
            link.click();
          }
        },
      });
    });
    gsap.to(".scroll-progress", {
      scaleX: 1,
      transformOrigin: "left",
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.15 },
    });
    const refresh = () => ScrollTrigger.refresh();
    document.fonts.ready.then(refresh);
    window.addEventListener("load", refresh, { once: true });
    cleanups.push(() => window.removeEventListener("load", refresh));
    ScrollTrigger.refresh();
  });
  return () => {
    cleanups.forEach((fn) => fn());
    ctx.revert();
  };
}
