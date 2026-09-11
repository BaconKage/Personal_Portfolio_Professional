import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** All DOM animation is scoped and reversible when a route or motion preference changes. */
export function mountChoreography() {
  gsap.registerPlugin(ScrollTrigger);
  const cleanups: (() => void)[] = [];
  const ctx = gsap.context(() => {
    const desktop = matchMedia("(min-width: 900px)").matches;
    const hero = document.querySelector<HTMLElement>(".hero");
    const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
    if (hero) {
      intro
        .from(".hero-line-inner", {
          yPercent: 115,
          rotation: 3,
          stagger: 0.14,
          duration: 1.35,
        })
        .from(".hero-art", { opacity: 0, duration: 1.5 }, 0.05)
        .from(
          ".hero-topline",
          { autoAlpha: 0, y: 22, stagger: 0.12, duration: 0.9 },
          0.45,
        );
      const exit = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1,
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
      gsap.from(el, {
        borderRadius: desktop ? 110 : 32,
        scrollTrigger: {
          trigger: el,
          start: "top 95%",
          end: "top 12%",
          scrub: 0.8,
        },
      });
      gsap.from(el.querySelectorAll(".kinetic-letter"), {
        yPercent: 115,
        rotationX: -70,
        stagger: 0.045,
        duration: 1.05,
        ease: "expo.out",
        scrollTrigger: {
          trigger: el,
          start: "top 78%",
          toggleActions: "play none none reverse",
        },
      });
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
            scrub: 1,
          },
        },
      );
      gsap.from(el.querySelectorAll(".project-top,.project-bottom"), {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        scrollTrigger: {
          trigger: el,
          start: "top 60%",
          toggleActions: "play none none reverse",
        },
      });
    });
    document
      .querySelectorAll<HTMLElement>(
        ".section-heading h2,.about h2,.research h2,.case-context h2,.experience h2,.contact h2",
      )
      .forEach((el) => {
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
    bands.forEach((el,i) => gsap.fromTo(el,{xPercent:i ? -20 : 0},{xPercent:i ? 0 : -20,ease:"none",
      scrollTrigger:{trigger:".discipline-band",start:"top bottom",end:"bottom top",scrub:1}}));
    const journey = document.querySelector(".signal-journey");
    if(journey) {
      const flight = gsap.timeline({scrollTrigger:{trigger:journey,start:"top top",end:"bottom bottom",scrub:.65}});
      flight.to(".signal-copy h2",{y:-55,opacity:0,duration:.22},.34)
        .fromTo(".signal-arrival",{y:60,opacity:0,scale:.88},{y:0,opacity:1,scale:1,duration:.22},.45)
        .fromTo(".signal-meter span",{scaleX:0},{scaleX:1,duration:1,ease:"none"},0);
    }
    if (readingWords.length) gsap.fromTo(readingWords, { color: "#686a62" }, {
      color: "#111315", stagger: 0.15, ease: "none",
      scrollTrigger: { trigger: ".about-copy", start: "top 82%", end: "top 35%", scrub: .5 },
    });
    if (document.querySelector(".research-mark")) gsap.fromTo(".research-mark", { rotation: -28, scale: .7 }, {
      rotation: 28, scale: 1.12, ease: "none",
      scrollTrigger: { trigger: ".research", start: "top bottom", end: "bottom top", scrub: 1 },
    });
    document.querySelectorAll(".experience-row").forEach(el => {
      gsap.from(el.children, { y: 35, opacity: 0, stagger: .12, duration: .8, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
    if (desktop && document.querySelector(".contact")) gsap.from(".contact", {
      borderRadius: "100px 100px 0 0", scale: .94, transformOrigin: "center bottom",
      scrollTrigger: { trigger: ".contact", start: "top 95%", end: "top 20%", scrub: 1 },
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
          ".contact-pill,.round-link b,.project-cta",
        )
        .forEach((el) => {
          const x = gsap.quickTo(el, "x", {
              duration: 0.45,
              ease: "power3.out",
            }),
            y = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            x((e.clientX - r.left - r.width / 2) * 0.18);
            y((e.clientY - r.top - r.height / 2) * 0.2);
          };
          const leave = () => {
            x(0);
            y(0);
          };
          el.addEventListener("pointermove", move);
          el.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerleave", leave);
            x.tween.kill();
            y.tween.kill();
            gsap.set(el, { clearProps: "transform" });
          });
        });
    }
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
