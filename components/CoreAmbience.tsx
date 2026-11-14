"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getCoreState, resetCore, subscribeCore } from "@/lib/core-sequence";
import {
  initSound,
  playPress,
  playTick,
  setCorePhase,
  setCorePresence,
} from "@/lib/sound";

const INTERACTIVE = "a[href],button,select,summary,[role='button'],.hero-core-surface";

/**
 * The reactor's power reaches past the hero. While it charges and runs,
 * <html data-power> is set and the page's accents answer to it in CSS; the
 * WebGL loop reads the same state for the mouse trail and the card edges,
 * and the phase drives the sound. Once energised it stays on across pages
 * until the reader powers it down.
 */
export default function CoreAmbience() {
  const path = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const { phase } = getCoreState();
      // One switch, thrown on the reader's click: on while charging and
      // online, off as it cools. Changing an attribute on <html> restyles
      // the whole document, so it must not also change at ignition, where
      // that work would land on the flash itself.
      const on = phase === "charging" || phase === "online";
      if (on !== (root.dataset.power === "on")) {
        if (on) root.dataset.power = "on";
        else delete root.dataset.power;
      }
      setCorePhase(phase);
    };
    const unsubscribe = subscribeCore(sync);
    sync();
    // Without motion or WebGL there is no reactor to be powered.
    const availability = new MutationObserver(() => {
      if (root.dataset.motion === "reduced" || root.dataset.graphicsFallback)
        resetCore();
    });
    availability.observe(root, {
      attributes: true,
      attributeFilter: ["data-motion", "data-graphics-fallback"],
    });
    const disposeSound = initSound();

    // Hovers tick once per control, not once per element crossed inside it.
    let over: Element | null = null;
    const hover = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target =
        event.target instanceof Element
          ? event.target.closest(INTERACTIVE)
          : null;
      if (target === over) return;
      over = target;
      if (target) playTick();
    };
    const press = (event: PointerEvent) => {
      if (
        event.button === 0 &&
        event.target instanceof Element &&
        event.target.closest(INTERACTIVE)
      )
        playPress();
    };
    document.addEventListener("pointerover", hover, { passive: true });
    document.addEventListener("pointerdown", press, { passive: true });
    return () => {
      unsubscribe();
      availability.disconnect();
      disposeSound();
      document.removeEventListener("pointerover", hover);
      document.removeEventListener("pointerdown", press);
      delete root.dataset.power;
    };
  }, []);

  // The hum is loudest beside the reactor and recedes down the page; on
  // pages without the hero it stays a distant presence.
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>(".hero-stage");
    if (!stage) {
      setCorePresence(0.3);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      // Near for as long as the hero holds the screen (the dive included),
      // then receding as it scrolls away.
      const bottom = stage.offsetTop + stage.offsetHeight - window.scrollY;
      const seen = Math.max(0, Math.min(1, bottom / Math.max(1, innerHeight)));
      setCorePresence(0.3 + 0.7 * seen);
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scroll);
    };
  }, [path]);

  return null;
}
