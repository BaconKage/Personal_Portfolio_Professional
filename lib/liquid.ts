/**
 * Shapes for the liquid edges between light and dark sections. The upper
 * section's colour hangs over the top of the next one as a meniscus with
 * drips; scroll position fills them out, scroll speed stretches them.
 *
 * Pure (numbers in, path and circles out) so the server can render a still
 * edge and tests can check the geometry.
 */
export type Drip = {
  /** Centre, in CSS px from the left. */
  x: number;
  /** Half-width of the drip's neck. */
  width: number;
  /** Share of the full depth this drip can reach. */
  reach: number;
  /** Wobble speed and phase. */
  speed: number;
  phase: number;
};
export type LiquidState = {
  width: number;
  /** Deepest a drip may hang, in px. */
  depth: number;
  /** 0 = resting meniscus, 1 = fully poured. */
  level: number;
  /** Scroll inertia: above 1 drips lag and stretch. */
  stretch: number;
  /** Surface agitation from scroll speed, 0..1. */
  agitation: number;
  /** Seconds, for the slow surface waves and wobble. */
  time: number;
};
export type Bulb = { cx: number; cy: number; r: number };

/** A stable pseudo-random sequence, so every render agrees. */
function sequence(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Drips spaced across the width, never bunched, the same for a given seed. */
export function createDrips(width: number, seed: number): Drip[] {
  const random = sequence(seed);
  const spacing = width < 600 ? 64 : 104;
  const count = Math.max(3, Math.min(16, Math.floor(width / spacing)));
  const slot = width / count;
  return Array.from({ length: count }, (_, i) => ({
    x: slot * (i + 0.5) + (random() - 0.5) * slot * 0.55,
    width: 9 + random() * (width < 600 ? 7 : 12),
    reach: 0.32 + random() * 0.68,
    speed: 0.6 + random() * 0.9,
    phase: random() * Math.PI * 2,
  }));
}

/** How far a drip hangs below the surface right now. */
export function dripLength(drip: Drip, s: LiquidState) {
  const wobble = 0.86 + 0.14 * Math.sin(s.time * drip.speed + drip.phase);
  return Math.max(
    0,
    s.depth * 0.82 * s.level * drip.reach * wobble * s.stretch,
  );
}

/** The resting surface: a shallow meniscus with slow, interfering waves. */
export function surface(x: number, s: LiquidState) {
  const t = s.time;
  const wave =
    3.2 * Math.sin(x * 0.011 + t * 0.8) +
    2 * Math.sin(x * 0.027 - t * 1.3) +
    1.2 * Math.sin(x * 0.051 + t * 2.1);
  const base = s.depth * (0.06 + 0.07 * s.level);
  return Math.max(2, base + wave * (0.45 + s.agitation * 0.9));
}

/**
 * The liquid as an SVG path (filled from the top edge down to the surface
 * and drips) plus the round bulbs that weigh down each drip's tip.
 */
export function liquidShape(s: LiquidState, drips: Drip[], step = 6) {
  const lengths = drips.map((d) => dripLength(d, s));
  // Paint thickens as more of it runs: a drip's column widens with length.
  const widths = drips.map(
    (d, i) =>
      d.width *
      (0.55 + 0.45 * Math.min(1, lengths[i] / Math.max(1, s.depth * 0.6))),
  );
  const depthAt = (x: number) => {
    let y = surface(x, s);
    for (let i = 0; i < drips.length; i++) {
      if (!lengths[i]) continue;
      const u = (x - drips[i].x) / (widths[i] * 0.7);
      if (Math.abs(u) > 6) continue;
      // A flat-topped profile gives a column of near-constant width with a
      // rounded end (a bell curve would taper to a needle); a soft fillet
      // flares it where it leaves the surface.
      const column = Math.exp(-(u * u) * (u * u));
      const flare = 0.3 * Math.exp(-((u / 2.4) ** 2));
      y += lengths[i] * (column + flare - column * flare);
    }
    return Math.min(y, s.depth);
  };
  let path = `M0 0L0 ${depthAt(0).toFixed(1)}`;
  for (let x = step; x < s.width; x += step)
    path += `L${x} ${depthAt(x).toFixed(1)}`;
  path += `L${s.width} ${depthAt(s.width).toFixed(1)}L${s.width} 0Z`;
  // A drop gathering at each tip, a little wider than its column.
  const bulbs: Bulb[] = drips.map((d, i) => {
    const r =
      widths[i] *
      (0.62 + 0.16 * Math.min(1, lengths[i] / Math.max(1, s.depth * 0.5)));
    const tip = surface(d.x, s) + lengths[i];
    return {
      cx: d.x,
      cy: Math.min(s.depth - r, tip - r * 0.55),
      r: lengths[i] > r * 1.2 ? r : 0,
    };
  });
  return { path, bulbs, lengths };
}
