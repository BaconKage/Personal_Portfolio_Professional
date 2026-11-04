"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";

/**
 * Text under the pointer changes colour (after buttermax.net). A soft brush
 * follows the mouse and leaves a short fading trail. Where it is strong the
 * text takes an accent colour through a white edge; at its rim, a shifting
 * rainbow; beyond, the text keeps its own colour.
 *
 * The brush is painted into each text element's own background, clipped to
 * its glyphs, so only text changes colour and only the few elements under
 * the brush repaint. Mouse only; nothing runs while the pointer rests away
 * from text.
 */

const SKIP =
  "script,style,noscript,textarea,select,option,svg,.cursor-label,.preloader,[data-lens-off]";
/** Per-frame fade of the trail (buttermax's), and how fast the brush catches
 * the pointer each 60Hz frame: quick enough to feel attached to it. */
const TRAIL = 0.94;
const EASE = 0.42;
const FRAME = 1000 / 60;
/** Frames until a stamp fades below the faintest visible level (0.25). */
const LIFE_FRAMES = Math.log(0.25) / Math.log(TRAIL);
/** Most stamps alive at once: spacing widens on fast strokes to stay under. */
const MAX_STAMPS = 12;

/** Inverse of smoothstep(0, 1, x): where the brush falls to a given level. */
const unsmooth = (s: number) => 0.5 - Math.sin(Math.asin(1 - 2 * s) / 3);
/** Brush radius, in px from the centre, above `level` for a stamp of strength k. */
const reach = (radius: number, k: number, level: number) =>
  k > level ? radius * unsmooth(1 - level / k) : 0;

type Stamp = { x: number; y: number; k: number; rim: number };
type Hit = { el: HTMLElement; rect: DOMRect };
type Style = { ok: boolean; accent: string };

const styles = new WeakMap<HTMLElement, Style>();
/** Background-clip would erase a filled background, so those are skipped. */
function describe(el: HTMLElement): Style {
  let style = styles.get(el);
  if (style) return style;
  const cs = getComputedStyle(el);
  const [r = 0, g = 0, b = 0] = (cs.color.match(/[\d.]+/g) || []).map(Number);
  const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5;
  style = {
    ok:
      cs.backgroundImage === "none" &&
      /^(transparent|rgba\(.*,\s*0\))$/.test(cs.backgroundColor),
    // A section can set --lens; otherwise lime on light text, blue on dark.
    accent:
      cs.getPropertyValue("--lens").trim() || (light ? "#c5f394" : "#244cff"),
  };
  styles.set(el, style);
  return style;
}

/** Every element that directly holds visible text. */
function collect() {
  const found = new Set<HTMLElement>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || found.has(el) || !node.nodeValue?.trim() || el.closest(SKIP))
      continue;
    found.add(el);
  }
  return found;
}

export default function TextLens() {
  const path = usePathname();
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const visible = new Set<HTMLElement>();
    // Rects are re-read only when something may have moved them.
    const rects = new Map<HTMLElement, DOMRect>();
    let measured = 0,
      stale = true;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
        else visible.delete(entry.target as HTMLElement);
    });
    const refresh = () => {
      io.disconnect();
      visible.clear();
      collect().forEach((el) => io.observe(el));
      stale = true;
    };
    refresh();
    // Split headings, revealed copy and route changes add text; re-scan once
    // things settle, ignoring text that updates on its own (counters, labels).
    let rescan: ReturnType<typeof setTimeout> | undefined;
    const mutations = new MutationObserver((records) => {
      if (
        records.every(
          (r) => r.target instanceof Element && r.target.closest(SKIP),
        )
      )
        return;
      clearTimeout(rescan);
      rescan = setTimeout(refresh, 250);
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    const mouse = { x: 0, y: 0, inside: false };
    const head = { x: 0, y: 0 };
    // Paint stays where it was laid and fades in place, like buttermax's
    // trail texture: stamps are dropped along the brush's path, never moved.
    const trail: { x: number; y: number; t: number }[] = [];
    const drop = { x: 0, y: 0 };
    const lensed = new Set<HTMLElement>();
    let hits: Hit[] = [];
    let running = false,
      last = 0,
      scrolled = 0;

    const clear = (el: HTMLElement) => {
      el.style.removeProperty("background-image");
      el.removeAttribute("data-lens");
      lensed.delete(el);
    };
    const stop = () => {
      running = false;
      gsap.ticker.remove(tick);
    };
    const wake = () => {
      if (running) return;
      running = true;
      last = 0;
      gsap.ticker.add(tick);
    };

    function tick() {
      const now = performance.now();
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      if (document.hidden || !mouse.inside) {
        lensed.forEach(clear);
        hits = [];
        trail.length = 0;
        stop();
        return;
      }
      const ease = 1 - Math.pow(1 - EASE, dt * 60);
      const dx = mouse.x - head.x,
        dy = mouse.y - head.y;
      head.x += dx * ease;
      head.y += dy * ease;
      const radius = Math.max(44, innerWidth / 20);

      // Lay stamps along the path since the last one, evenly spaced, so a
      // fast stroke stays continuous and a slow one stays light.
      const speed = Math.hypot(dx * ease, dy * ease);
      const spacing = Math.max(
        radius * 0.32,
        (speed * LIFE_FRAMES) / MAX_STAMPS,
      );
      let gap = Math.hypot(head.x - drop.x, head.y - drop.y);
      while (gap >= spacing) {
        const f = spacing / gap;
        drop.x += (head.x - drop.x) * f;
        drop.y += (head.y - drop.y) * f;
        trail.push({ x: drop.x, y: drop.y, t: now });
        gap -= spacing;
      }
      while (
        trail.length &&
        (trail.length > MAX_STAMPS || (now - trail[0].t) / FRAME > LIFE_FRAMES)
      )
        trail.shift();

      const stamp = (x: number, y: number, k: number): Stamp => ({
        x,
        y,
        k,
        rim: reach(radius, k, 0.25),
      });
      const stamps: Stamp[] = [stamp(head.x, head.y, 1)];
      for (let i = trail.length - 1; i >= 0; i--) {
        const k = Math.pow(TRAIL, (now - trail[i].t) / FRAME);
        if (k > 0.25) stamps.push(stamp(trail[i].x, trail[i].y, k));
      }
      const still =
        stamps.length === 1 && Math.hypot(dx, dy) < 0.3 && now - scrolled > 150;

      // Read every rect first, then write, so layout is measured once. Rects
      // are reused between reads unless the page scrolled or changed; a
      // periodic read catches text that animates under a moving brush.
      if (!still) {
        if (stale || now - scrolled < 50 || now - measured > 200) {
          rects.clear();
          for (const el of visible) rects.set(el, el.getBoundingClientRect());
          measured = now;
          stale = false;
        }
        hits = [];
        for (const [el, rect] of rects) {
          if (!rect.width) continue;
          for (const s of stamps) {
            const ox = Math.max(rect.left - s.x, 0, s.x - rect.right),
              oy = Math.max(rect.top - s.y, 0, s.y - rect.bottom);
            if (ox * ox + oy * oy < s.rim * s.rim) {
              hits.push({ el, rect });
              break;
            }
          }
        }
      }
      if (still && !hits.length) {
        lensed.forEach(clear);
        stop();
        return;
      }

      const hue = -(now / 1000) * 720;
      const current = new Set<HTMLElement>();
      for (const { el, rect } of hits) {
        const style = describe(el);
        // A wrapped inline element paints its background across fragments.
        if (!style.ok || el.getClientRects().length > 1) continue;
        // Transforms scale the box; the background lives in its own space.
        const sx = rect.width / (el.offsetWidth || rect.width),
          sy = rect.height / (el.offsetHeight || rect.height),
          scale = (sx + sy) / 2 || 1;
        const cores: string[] = [],
          rings: string[] = [];
        for (const s of stamps) {
          // Only stamps that reach this element add layers to it.
          const ox = Math.max(rect.left - s.x, 0, s.x - rect.right),
            oy = Math.max(rect.top - s.y, 0, s.y - rect.bottom);
          if (ox * ox + oy * oy >= s.rim * s.rim) continue;
          const x = ((s.x - rect.left) / sx).toFixed(1),
            y = ((s.y - rect.top) / sy).toFixed(1);
          const core = reach(radius, s.k, 0.5) / scale,
            white = reach(radius, s.k, 0.4) / scale,
            rim = s.rim / scale;
          // Strong: accent through a white edge. Weaker: the rainbow rim.
          if (white)
            cores.push(
              `radial-gradient(circle ${white.toFixed(1)}px at ${x}px ${y}px,${style.accent} ${core.toFixed(1)}px,#fff ${(white - 1).toFixed(1)}px,transparent ${white.toFixed(1)}px)`,
            );
          const inner = hue - Math.min(s.k, 0.4) * 720,
            outer = hue - 0.25 * 720 - (s.x - rect.left) * 0.6;
          rings.push(
            `radial-gradient(circle ${rim.toFixed(1)}px at ${x}px ${y}px,hsl(${inner.toFixed(0)} 100% 62%) ${white.toFixed(1)}px,hsl(${((inner + outer) / 2).toFixed(0)} 100% 62%) ${((white + rim) / 2).toFixed(1)}px,hsl(${outer.toFixed(0)} 100% 62%) ${(rim - 1).toFixed(1)}px,transparent ${rim.toFixed(1)}px)`,
          );
        }
        // Cores above every rim: the rainbow shows only at the brush's edge.
        el.style.backgroundImage = [
          ...cores,
          ...rings,
          "linear-gradient(currentColor,currentColor)",
        ].join(",");
        if (!el.hasAttribute("data-lens")) el.setAttribute("data-lens", "");
        current.add(el);
        lensed.add(el);
      }
      lensed.forEach((el) => {
        if (!current.has(el)) clear(el);
      });
    }

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (!mouse.inside) {
        // Entering the page: start the brush here, not streaking from afar.
        head.x = drop.x = event.clientX;
        head.y = drop.y = event.clientY;
        trail.length = 0;
      }
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.inside = true;
      wake();
    };
    const leave = () => {
      mouse.inside = false;
      wake();
    };
    // Text scrolling beneath a resting pointer changes colour too.
    const scroll = () => {
      scrolled = performance.now();
      stale = true;
      if (mouse.inside) wake();
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      stop();
      clearTimeout(rescan);
      io.disconnect();
      mutations.disconnect();
      lensed.forEach(clear);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, [path]);
  return null;
}
