"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  attachLenis,
  getLenis,
  scrollToTarget,
  unlockScroll,
} from "@/lib/scroll";

/**
 * Lenis, ScrollTrigger, and the WebGL renderer share gsap.ticker, so every
 * frame runs scroll → DOM choreography → GPU in that order with no drift.
 */
export default function SmoothScroll() {
  const path = usePathname();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({
      lerp: 0.095,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
      stopInertiaOnNavigate: true,
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    // Prioritised so Lenis always writes scroll before choreography and WebGL read it.
    gsap.ticker.add(tick, false, true);
    gsap.ticker.lagSmoothing(0);
    attachLenis(lenis);

    // In-page anchors glide instead of jumping; focus follows for keyboard users.
    // Capture phase runs before next/link, whose own hash handling would jump.
    const click = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        !anchor ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.target
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (
        url.origin !== location.origin ||
        url.pathname !== location.pathname ||
        !url.hash
      )
        return;
      const id = decodeURIComponent(url.hash.slice(1));
      const target =
        id === "main" || id === "top" ? null : document.getElementById(id);
      if (id !== "main" && id !== "top" && !target) return;
      event.preventDefault();
      // Release the menu lock first: restarting Lenis would cancel the glide.
      if (anchor.closest("dialog")) {
        unlockScroll("menu");
        anchor.closest("dialog")?.close();
      }
      scrollToTarget(target ?? 0);
      history.pushState(null, "", url.hash);
      const focusable = target ?? document.getElementById("main");
      if (focusable) {
        if (!focusable.hasAttribute("tabindex"))
          focusable.setAttribute("tabindex", "-1");
        focusable.focus({ preventScroll: true });
      }
    };
    document.addEventListener("click", click, true);

    return () => {
      document.removeEventListener("click", click, true);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      attachLenis(null);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    // Next has already restored or reset scroll; resync Lenis to it.
    const lenis = getLenis();
    if (!lenis) return;
    unlockScroll("route");
    lenis.resize();
    lenis.scrollTo(window.scrollY, { immediate: true, force: true });
  }, [path]);

  return null;
}
