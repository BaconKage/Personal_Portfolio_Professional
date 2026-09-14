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

/** Resolution adapts; effects and geometry stay mounted throughout the change. */
export function createRenderBudget(maxDpr: number, minDpr: number) {
  let dpr = maxDpr,
    elapsed = 0,
    frames = 0,
    late = 0;
  let cooldown = 1200,
    healthy = 0;
  return {
    get dpr() {
      return dpr;
    },
    reset() {
      elapsed = frames = late = healthy = 0;
      cooldown = 1200;
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
      healthy = average < 18 && missed < 0.08 ? healthy + elapsed : 0;
      elapsed = frames = late = 0;
      if (overloaded && dpr > minDpr) {
        dpr = Math.max(minDpr, Math.round((dpr - 0.125) * 1000) / 1000);
        cooldown = 1200;
        healthy = 0;
        return dpr;
      }
      if (healthy > 7000 && dpr < maxDpr) {
        dpr = Math.min(maxDpr, Math.round((dpr + 0.125) * 1000) / 1000);
        cooldown = 2000;
        healthy = 0;
        return dpr;
      }
      return null;
    },
  };
}
