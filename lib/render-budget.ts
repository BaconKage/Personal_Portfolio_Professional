export type DeviceBudget = {
  width: number;
  height: number;
  dpr: number;
  coarse: boolean;
  cores: number;
  memory: number;
};
export function getRenderProfile(device: DeviceBudget) {
  const compact = device.coarse || device.cores <= 4 || device.memory <= 4;
  const pixelBudget = compact ? 1_800_000 : 2_800_000;
  const maxDpr = Math.min(
    device.dpr || 1,
    compact ? 1.25 : 1.75,
    Math.sqrt(pixelBudget / Math.max(1, device.width * device.height)),
  );
  return {
    maxDpr,
    minDpr: Math.min(maxDpr, 0.75),
    geometryQuality: compact ? 0.55 : 1,
  };
}

/**
 * Resolution only ever steps down, in a few large steps. Every change
 * reallocates the drawing buffer (a visible hitch), so oscillating between
 * levels costs more smoothness than it recovers in sharpness.
 */
export function createRenderBudget(maxDpr: number, minDpr: number) {
  let dpr = maxDpr,
    elapsed = 0,
    frames = 0,
    late = 0;
  let cooldown = 1200;
  const step = () =>
    Math.max(0.125, Math.ceil(((maxDpr - minDpr) / 3) * 8) / 8);
  return {
    get dpr() {
      return dpr;
    },
    reset() {
      elapsed = frames = late = 0;
      cooldown = Math.max(cooldown, 1200);
    },
    resize(maximum: number, minimum: number) {
      maxDpr = maximum;
      minDpr = minimum;
      dpr = Math.max(minDpr, Math.min(dpr, maxDpr));
      this.reset();
      return dpr;
    },
    sample(ms: number): number | null {
      // Idle gaps, hidden tabs, and initial shader compilation are not sustained load.
      if (!Number.isFinite(ms) || ms <= 0 || ms > 250) {
        this.reset();
        return null;
      }
      if (cooldown > 0) {
        cooldown -= ms;
        return null;
      }
      elapsed += ms;
      frames++;
      if (ms > 22) late++;
      if (elapsed < 1000) return null;
      const average = elapsed / frames,
        missed = late / frames;
      const overloaded = average > 22 && missed > 0.2;
      elapsed = frames = late = 0;
      if (overloaded && dpr > minDpr) {
        dpr = Math.max(minDpr, Math.round((dpr - step()) * 1000) / 1000);
        // A new resolution needs time to show its real cost before judging again.
        cooldown = 3000;
        return dpr;
      }
      return null;
    },
  };
}
