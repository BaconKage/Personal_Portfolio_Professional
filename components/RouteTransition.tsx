"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";
import { lockScroll, unlockScroll } from "@/lib/scroll";
import { projectZoom } from "@/lib/zoom";
import { playWhoosh } from "@/lib/sound";

/** A clip that hides nothing, in the same shape as the one it eases to. */
const UNCLIPPED = "inset(0px 0px 0px 0px round 0px)";

/** Grab the canvas's next frame (bounded), or null if it never comes. */
function captureFrame(isCurrent: () => boolean) {
  return new Promise<HTMLCanvasElement | null>((resolve) => {
    let complete = false;
    const timeout = setTimeout(() => {
      complete = true;
      resolve(null);
    }, 160);
    window.dispatchEvent(
      new CustomEvent("project-frame", {
        detail: (source: HTMLCanvasElement) => {
          if (complete || !isCurrent()) return;
          complete = true;
          clearTimeout(timeout);
          try {
            const canvas = document.createElement("canvas");
            canvas.width = source.width;
            canvas.height = source.height;
            canvas.getContext("2d")?.drawImage(source, 0, 0);
            canvas.style.cssText =
              "position:absolute;inset:0;width:100%;height:100%;";
            resolve(canvas);
          } catch {
            resolve(null);
          }
        },
      }),
    );
  });
}

export default function RouteTransition({ reduced }: { reduced: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const mode = useRef<"curtain" | "project">("curtain");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);

  // Arrival: the new page is underneath; clear the way to it.
  useEffect(() => {
    if (!pending.current) return;
    if (timer.current) clearTimeout(timer.current);
    const stage = zoom.current;
    const finish = () => {
      pending.current = false;
      if (stage) {
        stage.replaceChildren();
        gsap.set(stage, { autoAlpha: 0, clipPath: "none" });
      }
      gsap.set(panel.current, { yPercent: 100 });
    };
    if (mode.current !== "project" || !stage) {
      gsap.to(panel.current, {
        yPercent: -100,
        duration: 0.75,
        ease: "expo.inOut",
        onComplete: finish,
      });
      return;
    }
    // The frozen frame is the project's world at full screen. On a case
    // study it settles into the slot where that same world lives on the
    // page: the frame closes down onto it while the title rises in the
    // space it gives up, then hands over to the live scene.
    const slot = document.querySelector<HTMLElement>(".case-visual");
    const frame = stage.firstElementChild;
    if (!slot) {
      gsap.to(stage, {
        opacity: 0,
        scale: 1.08,
        duration: 0.65,
        ease: "power2.inOut",
        onComplete: finish,
      });
      return;
    }
    const r = slot.getBoundingClientRect();
    // The page arrives scrolled to the top, whatever it reads right now.
    const top = r.top + window.scrollY;
    const radius = parseFloat(getComputedStyle(slot).borderTopLeftRadius) || 0;
    const clip = `inset(${Math.max(0, top)}px ${Math.max(0, innerWidth - r.right)}px ${Math.max(0, innerHeight - top - r.height)}px ${Math.max(0, r.left)}px round ${radius}px)`;
    const settle = gsap.timeline({ onComplete: finish });
    settle.fromTo(
      stage,
      { clipPath: UNCLIPPED },
      { clipPath: clip, duration: 0.95, ease: "expo.inOut" },
      0,
    );
    // The image travels with its frame, onto the centre of the slot.
    if (frame)
      settle.to(
        frame,
        {
          x: r.left + r.width / 2 - innerWidth / 2,
          y: top + r.height / 2 - innerHeight / 2,
          scale: Math.min(1, r.width / innerWidth),
          duration: 0.95,
          ease: "expo.inOut",
        },
        0,
      );
    settle.to(stage, { autoAlpha: 0, duration: 0.4, ease: "power1.out" }, 0.82);
  }, [path]);

  useEffect(() => {
    const curtain = panel.current,
      stage = zoom.current;
    gsap.set(curtain, { y: 0, yPercent: 100 });
    if (reduced) return;
    let disposed = false;
    const click = async (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        !anchor ||
        anchor.target ||
        anchor.hasAttribute("download") ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (
        url.origin !== location.origin ||
        url.pathname === location.pathname ||
        url.hash
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (pending.current) return;
      pending.current = true;
      playWhoosh("travel");
      // Hold the page still under the transition; SmoothScroll releases on arrival.
      lockScroll("route");
      anchor.closest("dialog")?.close();
      const token = ++generation.current;
      const playground = anchor.hasAttribute("data-playground-project")
        ? anchor
            .closest(".playground")
            ?.querySelector<HTMLElement>(".playground-stage")
        : null;
      const fallback = playground
        ? Array.from(
            playground.querySelectorAll<HTMLElement>("[data-project-title]"),
          ).find(
            (el) => el.dataset.projectTitle === anchor.dataset.playgroundProject,
          )
        : null;
      const card =
        (playground?.dataset.ready === "true" ? playground : fallback) ||
        anchor.closest<HTMLElement>(
          ".project,.index-project,[data-project-zoom]",
        );
      const navigate = () => router.push(url.pathname + url.search);
      router.prefetch(url.pathname);
      let undoZoom = () => {};
      const release = () => {
        pending.current = false;
        generation.current++;
        undoZoom();
        unlockScroll("route");
        gsap.to(stage, {
          autoAlpha: 0,
          duration: 0.3,
          onComplete: () => stage?.replaceChildren(),
        });
        gsap.to(curtain, { yPercent: -100, duration: 0.3 });
      };
      timer.current = setTimeout(release, 6500);

      if (!card || !url.pathname.startsWith("/work/") || !stage) {
        mode.current = "curtain";
        const label = curtain?.querySelector("span");
        if (label)
          label.textContent =
            url.pathname === "/work" ? "All work." : "Home.";
        gsap.fromTo(
          curtain,
          { yPercent: 100 },
          {
            yPercent: 0,
            duration: 0.4,
            ease: "power3.inOut",
            onComplete: navigate,
          },
        );
        return;
      }

      mode.current = "project";
      const isCurrent = () => !disposed && token === generation.current;
      const rect = card.getBoundingClientRect();
      const background =
        card.dataset.sheetBg || getComputedStyle(card).background;
      const progress = { u: 0 };
      const run = (duration: number, ease: string, each: (u: number) => void) =>
        new Promise<void>((resolve) =>
          gsap.to(progress, {
            u: 1,
            duration,
            ease,
            onComplete: resolve,
            onUpdate: () => {
              if (!isCurrent()) return;
              each(progress.u);
              projectZoom.amount = progress.u;
              // The scenes are measured again: nothing here scrolls.
              window.dispatchEvent(new Event("scene-measure"));
            },
          }),
        );

      if (card.dataset.sheet === "true" && card.dataset.ready === "true") {
        // The card is a WebGL sheet: it opens itself. From the point of the
        // click it bursts outward, bending as its far edges catch up, until
        // it is the whole screen, while its world's camera pushes in. The
        // page does not move; the other cards' copy steps out of its way
        // and this card's title rolls off letter by letter.
        const section = card.closest<HTMLElement>(".selected") || card;
        const title = card.querySelector<HTMLElement>(".project-heading");
        const letters = card.querySelectorAll<HTMLElement>(".kinetic-letter");
        const copy = Array.from(
          section.querySelectorAll<HTMLElement>(
            ".project > :not(.project-art):not(.project-hit-area), .project-heading > p",
          ),
        ).filter((el) => el !== title);
        undoZoom = () => {
          projectZoom.element = null;
          projectZoom.amount = 0;
          gsap.set(copy, { clearProps: "opacity,visibility" });
          gsap.set(letters, { yPercent: 0 });
          window.dispatchEvent(new Event("scene-measure"));
        };
        gsap.to(copy, { autoAlpha: 0, duration: 0.3, ease: "power2.in" });
        // Two lines up: past the hover copy that sits beneath each letter.
        gsap.to(letters, {
          yPercent: -230,
          duration: 0.6,
          stagger: 0.018,
          ease: "power3.in",
        });
        // A keyboard activation has no pointer: open from the middle.
        const pointed = event.detail > 0;
        projectZoom.origin.x = pointed
          ? gsap.utils.clamp(0, 1, (event.clientX - rect.left) / rect.width)
          : 0.5;
        projectZoom.origin.y = pointed
          ? gsap.utils.clamp(0, 1, (event.clientY - rect.top) / rect.height)
          : 0.5;
        projectZoom.mode = "sheet";
        projectZoom.element = card;
        await run(1.05, "power3.inOut", () => {});
      } else {
        // Not a sheet (the work index, the playground, or no WebGL2): the
        // page itself zooms around the card until it overfills the screen.
        const layer =
          card.closest<HTMLElement>(".selected,.work-list,section") ||
          card.parentElement;
        const copy = Array.from(card.children).filter(
          (child) =>
            !child.matches(
              ".project-art,.index-art,.project-hit-area,.artwork",
            ) && !child.querySelector("img.artwork"),
        );
        const fill =
          Math.max(innerWidth / rect.width, innerHeight / rect.height) * 1.2;
        const cx = rect.left + rect.width / 2,
          cy = rect.top + rect.height / 2;
        undoZoom = () => {
          projectZoom.element = null;
          projectZoom.amount = 0;
          if (layer)
            gsap.set(layer, {
              clearProps: "transform,transformOrigin,willChange",
            });
          gsap.set(copy, { clearProps: "opacity,visibility" });
          window.dispatchEvent(new Event("scene-measure"));
        };
        gsap.to(copy, { autoAlpha: 0, duration: 0.35, ease: "power2.in" });
        if (layer) {
          const origin = layer.getBoundingClientRect();
          gsap.set(layer, {
            transformOrigin: `${cx - origin.left}px ${cy - origin.top}px`,
            willChange: "transform",
          });
          projectZoom.mode = "page";
          projectZoom.element = card;
          await run(1.15, "power2.inOut", (u) =>
            gsap.set(layer, {
              x: (innerWidth / 2 - cx) * u,
              y: (innerHeight / 2 - cy) * u,
              scale: 1 + (fill - 1) * u,
            }),
          );
        }
      }
      if (!isCurrent()) return;

      // Freeze what is on screen so the route can change beneath it.
      stage.replaceChildren();
      stage.style.background = background;
      const frame =
        card.dataset.ready === "true" ? await captureFrame(isCurrent) : null;
      if (!isCurrent()) return;
      if (frame) stage.append(frame);
      else {
        const poster = card
          .querySelector<HTMLImageElement>("img.artwork")
          ?.cloneNode(true) as HTMLImageElement | undefined;
        if (poster) {
          poster.removeAttribute("class");
          poster.removeAttribute("loading");
          poster.alt = "";
          poster.style.cssText =
            "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
          stage.append(poster);
        }
      }
      gsap.set(stage, {
        left: 0,
        top: 0,
        width: innerWidth,
        height: innerHeight,
        borderRadius: 0,
        scale: 1,
        autoAlpha: 1,
        clipPath: UNCLIPPED,
      });
      projectZoom.element = null;
      projectZoom.amount = 0;
      navigate();
    };
    document.addEventListener("click", click, true);
    return () => {
      disposed = true;
      document.removeEventListener("click", click, true);
      if (timer.current) clearTimeout(timer.current);
      gsap.killTweensOf(curtain);
      gsap.killTweensOf(stage);
      stage?.replaceChildren();
    };
  }, [router, reduced]);

  return (
    <>
      <div ref={panel} className="route-curtain" aria-hidden="true">
        <span>All work.</span>
      </div>
      <div ref={zoom} className="project-zoom" aria-hidden="true" />
    </>
  );
}
