"use client";
import { useEffect, useRef } from "react";
import { createDrips, liquidShape, type Drip } from "@/lib/liquid";

/**
 * A liquid boundary between a section and the next. Placed between them,
 * it hangs the upper section's colour over the top of the lower one: a
 * meniscus with drips that pour out as the boundary crosses the middle of
 * the screen, wobble back like a liquid, and stretch when scrolling fast.
 * On desktop the occasional droplet breaks away.
 *
 * Drips stop short of the lower section's first text (measured live). The
 * shape is written straight to the SVG; one shared loop runs only while an
 * edge is on screen. Reduced motion and no-JS get a still edge.
 */
type Drop = {
  x: number;
  y: number;
  y0: number;
  vy: number;
  r: number;
  active: boolean;
};
type Edge = {
  svg: SVGSVGElement;
  path: SVGPathElement;
  bulbs: SVGCircleElement[];
  drops: SVGCircleElement[];
  drips: Drip[];
  seed: number;
  max: number;
  width: number;
  depth: number;
  height: number;
  visible: boolean;
  /** Boundary position in the document, so frames never read layout. */
  docTop: number;
  /** Settled: drawn once and left alone until the page scrolls again. */
  resting: boolean;
  level: number;
  levelVelocity: number;
  stretch: number;
  stretchVelocity: number;
  agitation: number;
  time: number;
  cooldown: number[];
  dropState: Drop[];
};

const MAX_DRIPS = 16;
const STILL = { level: 0.35, stretch: 1, agitation: 0, time: 0 };
const edges = new Set<Edge>();
let frame = 0,
  last = 0,
  lastScroll = 0,
  velocity = 0;

const still = () =>
  document.documentElement.dataset.motion === "reduced" ||
  matchMedia("(prefers-reduced-motion: reduce)").matches;

function draw(
  edge: Edge,
  s = {
    level: edge.level,
    stretch: edge.stretch,
    agitation: edge.agitation,
    time: edge.time,
  },
) {
  const shape = liquidShape(
    { width: edge.width, depth: edge.depth, ...s },
    edge.drips,
  );
  edge.path.setAttribute("d", shape.path);
  edge.bulbs.forEach((circle, i) => {
    const b = shape.bulbs[i];
    circle.setAttribute("r", b ? b.r.toFixed(1) : "0");
    if (b) {
      circle.setAttribute("cx", b.cx.toFixed(1));
      circle.setAttribute("cy", b.cy.toFixed(1));
    }
  });
  return shape;
}

function tick(now: number) {
  frame = 0;
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  // Scroll speed in px/s, smoothed: Lenis and native scrolling both move scrollY.
  const raw = (scrollY - lastScroll) / dt;
  lastScroll = scrollY;
  velocity += (raw - velocity) * (1 - Math.exp(-dt * 10));
  const speed = Math.abs(velocity);
  let running = false;
  for (const edge of edges) {
    if (!edge.visible || !edge.width || edge.resting) continue;
    running = true;
    edge.time += dt;
    // Pour while the boundary crosses the middle of the screen. The cached
    // document position avoids forcing a layout read every frame.
    const p = (edge.docTop - scrollY) / innerHeight;
    const target =
      0.12 +
      0.88 * Math.exp(-(((p - 0.5) / 0.3) ** 2)) +
      Math.min(speed / 4000, 0.25);
    // Springs, a little underdamped: the liquid overshoots and settles.
    edge.levelVelocity +=
      (26 * (target - edge.level) - 6.5 * edge.levelVelocity) * dt;
    edge.level += edge.levelVelocity * dt;
    const stretchTarget = 1 + Math.max(-0.25, Math.min(0.55, velocity / 2600));
    edge.stretchVelocity +=
      (60 * (stretchTarget - edge.stretch) - 9 * edge.stretchVelocity) * dt;
    edge.stretch += edge.stretchVelocity * dt;
    edge.agitation +=
      (Math.min(speed / 2200, 1) - edge.agitation) * (1 - Math.exp(-dt * 4));
    const shape = draw(edge);
    // Once the scroll has stopped and every spring has come to rest, stop
    // redrawing: a still page costs nothing until it scrolls again.
    if (
      speed < 4 &&
      Math.abs(edge.levelVelocity) < 0.003 &&
      Math.abs(target - edge.level) < 0.003 &&
      Math.abs(edge.stretchVelocity) < 0.003 &&
      Math.abs(stretchTarget - edge.stretch) < 0.003 &&
      edge.agitation < 0.005 &&
      !edge.dropState.some((d) => d.active)
    )
      edge.resting = true;

    // Droplets: as a long drip draws back, a drop may break off its tip.
    if (edge.drops.length) {
      edge.drips.forEach((drip, i) => {
        edge.cooldown[i] -= dt;
        const bulb = shape.bulbs[i];
        if (
          bulb.r > 0 &&
          shape.lengths[i] > edge.depth * 0.5 &&
          edge.levelVelocity < -0.08 &&
          edge.cooldown[i] <= 0
        ) {
          const slot = edge.dropState.find((d) => !d.active);
          if (slot) {
            Object.assign(slot, {
              x: drip.x,
              y: bulb.cy + bulb.r * 0.7,
              y0: bulb.cy + bulb.r * 0.7,
              vy: 40,
              r: bulb.r * 0.55,
              active: true,
            });
            edge.cooldown[i] = 2.5 + ((i * 7 + edge.seed) % 5) * 0.4;
          }
        }
      });
      edge.dropState.forEach((drop, i) => {
        const circle = edge.drops[i];
        if (!drop.active) {
          if (circle.getAttribute("r") !== "0") circle.setAttribute("r", "0");
          return;
        }
        drop.vy += 1500 * dt;
        drop.y += drop.vy * dt;
        const fall = drop.y - drop.y0;
        const left = 1 - fall / Math.max(8, edge.height - drop.y0);
        if (left <= 0 || drop.y + drop.r > edge.height) {
          drop.active = false;
          circle.setAttribute("r", "0");
          return;
        }
        circle.setAttribute("cx", drop.x.toFixed(1));
        circle.setAttribute("cy", drop.y.toFixed(1));
        circle.setAttribute("r", (drop.r * Math.max(0.35, left)).toFixed(1));
        running = true;
      });
    }
  }
  if (running) frame = requestAnimationFrame(tick);
  else last = 0;
}
function wake() {
  for (const edge of edges) edge.resting = false;
  if (!frame && !still()) {
    lastScroll = scrollY;
    frame = requestAnimationFrame(tick);
  }
}

/** Space below the boundary before the lower section's first text. */
function room(lower: Element | null) {
  if (!lower) return 0;
  const top = lower.getBoundingClientRect().top;
  const text = Array.from(
    lower.querySelectorAll<HTMLElement>("h1,h2,h3,p,span,a,button,.eyebrow"),
  ).find((n) => n.offsetHeight > 0 && n.getBoundingClientRect().top >= top - 1);
  return text
    ? text.getBoundingClientRect().top - top
    : lower.getBoundingClientRect().height;
}

export default function LiquidEdge({
  seed,
  max,
  color,
}: {
  /** Varies the drip pattern between edges. */
  seed: number;
  /** Deepest the drips may hang, in px (also bounded by the space available). */
  max: number;
  /** The upper section's colour until it is read from the page. */
  color: string;
}) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = svg.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const upper = host.previousElementSibling,
      lower = host.nextElementSibling;
    if (upper) {
      const bg = getComputedStyle(upper).backgroundColor;
      if (!/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) host.style.color = bg;
    }
    const desktop = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const edge: Edge = {
      svg: el,
      path: el.querySelector("path")!,
      bulbs: Array.from(el.querySelectorAll<SVGCircleElement>("[data-bulb]")),
      drops: desktop
        ? Array.from(el.querySelectorAll<SVGCircleElement>("[data-drop]"))
        : [],
      drips: [],
      seed,
      max,
      width: 0,
      depth: 0,
      height: 0,
      visible: false,
      docTop: 0,
      resting: false,
      level: STILL.level,
      levelVelocity: 0,
      stretch: 1,
      stretchVelocity: 0,
      agitation: 0,
      time: seed * 3.7,
      cooldown: Array(MAX_DRIPS).fill(1),
      dropState: Array.from({ length: MAX_DRIPS }, () => ({
        x: 0,
        y: 0,
        y0: 0,
        vy: 0,
        r: 0,
        active: false,
      })),
    };
    // Moving without a scroll (content above grew) changes the pour target,
    // so a resting edge wakes to follow it.
    const locate = () => {
      const top = el.getBoundingClientRect().top + scrollY;
      if (Math.abs(top - edge.docTop) < 0.5) return;
      edge.docTop = top;
      wake();
    };
    const measure = () => {
      locate();
      const width = Math.round(host.getBoundingClientRect().width);
      const space = room(lower);
      edge.width = width;
      edge.depth = Math.max(20, Math.min(max, space - (desktop ? 34 : 22)));
      edge.height = Math.max(
        edge.depth,
        Math.min(space - 8, edge.depth + (edge.drops.length ? 40 : 0)),
      );
      edge.drips = createDrips(width, seed).slice(0, MAX_DRIPS);
      el.setAttribute("viewBox", `0 0 ${width} ${edge.height}`);
      el.setAttribute("preserveAspectRatio", "none");
      el.style.height = `${edge.height}px`;
      draw(edge, still() ? STILL : undefined);
      wake();
    };
    measure();
    edges.add(edge);
    // One shared, passive listener wakes resting edges when the page moves.
    if (edges.size === 1) addEventListener("scroll", wake, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(host);
    if (lower) resize.observe(lower);
    const visible = new IntersectionObserver(
      ([entry]) => {
        edge.visible = entry.isIntersecting;
        locate();
        if (edge.visible) wake();
      },
      { rootMargin: "120px 0px" },
    );
    visible.observe(el);
    const motion = () => {
      if (still()) {
        edge.dropState.forEach((d) => (d.active = false));
        edge.drops.forEach((c) => c.setAttribute("r", "0"));
        draw(edge, STILL);
      } else wake();
    };
    window.addEventListener("motion-change", motion);
    // Content above can grow (an Ask answer, fonts, images): re-locate.
    const page = new ResizeObserver(locate);
    page.observe(document.body);
    return () => {
      edges.delete(edge);
      if (!edges.size) removeEventListener("scroll", wake);
      resize.disconnect();
      visible.disconnect();
      window.removeEventListener("motion-change", motion);
      page.disconnect();
    };
  }, [seed, max]);

  // Server HTML: a still edge at a desktop width, cropped (not squashed) to
  // the screen until the client measures the real one.
  const width = 1440,
    depth = Math.round(max * 0.7);
  const drips = createDrips(width, seed);
  const shape = liquidShape({ width, depth, ...STILL }, drips);
  return (
    <div className="liquid-edge" aria-hidden="true" style={{ color }}>
      <svg
        ref={svg}
        viewBox={`0 0 ${width} ${depth}`}
        preserveAspectRatio="xMidYMin slice"
        style={{ height: depth }}
        focusable="false"
      >
        <path d={shape.path} fill="currentColor" />
        {Array.from({ length: MAX_DRIPS }, (_, i) => {
          const b = shape.bulbs[i];
          return (
            <circle
              key={`b${i}`}
              data-bulb=""
              cx={b ? b.cx.toFixed(1) : 0}
              cy={b ? b.cy.toFixed(1) : 0}
              r={b ? b.r.toFixed(1) : 0}
              fill="currentColor"
            />
          );
        })}
        {Array.from({ length: MAX_DRIPS }, (_, i) => (
          <circle key={`d${i}`} data-drop="" r={0} fill="currentColor" />
        ))}
      </svg>
    </div>
  );
}
