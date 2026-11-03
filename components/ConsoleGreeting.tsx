"use client";
import { useEffect } from "react";
import { profile } from "@/data/profile";

const SOURCE_URL = "https://github.com/BaconKage/Personal_Portfolio_Professional";
let greeted = false;

/** A note for whoever opens DevTools: the people most likely to read the source. */
export default function ConsoleGreeting() {
  useEffect(() => {
    if (greeted) return;
    greeted = true;
    const mono =
      "font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.7;";
    console.log(
      "%csv·",
      "font: 650 44px/1 system-ui, sans-serif; letter-spacing: -4px; color: #244cff; padding: 6px 0;",
    );
    console.log(
      [
        "%cHello, fellow engineer.",
        "",
        "Since you opened the console, here is how this site works.",
        "One persistent WebGL canvas (React Three Fiber) renders every scene",
        "through scissored viewports, while GSAP and Lenis share a single ticker.",
        "",
        "Press ⌘K (Ctrl+K) to drive the whole site from the keyboard.",
        "",
        `Source      → ${SOURCE_URL}`,
        `Say hello   → ${profile.email}`,
      ].join("\n"),
      mono,
    );
  }, []);
  return null;
}
