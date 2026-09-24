export type DeviceBudget = {
  width: number;
  height: number;
  dpr: number;
  coarse: boolean;
  cores: number;
  memory: number;
  /** The WebGL renderer string, when the browser exposes it. */
  gpu?: string;
  /** The reader asked the browser to save data (often a low-end device). */
  saveData?: boolean;
};
export type GpuTier = "software" | "low" | "standard";

/**
 * Coarse GPU class from the renderer string. Software rasterisers draw every
 * pixel on the CPU; older integrated and entry mobile GPUs have little fill
 * rate. Anything unrecognised is treated as standard and left to the budget.
 */
export function getGpuTier(gpu = ""): GpuTier {
  if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu))
    return "software";
  if (
    /intel.*\b(hd|uhd)\b|intel.*(gma|graphics \d{3,4}\b)|mali-(4|t\d|g[35]\d\b)|adreno.*\b[2-5]\d{2}\b|powervr|videocore|sgx/i.test(
      gpu,
    )
  )
    return "low";
  return "standard";
}

export function getRenderProfile(device: DeviceBudget) {
  const tier = getGpuTier(device.gpu);
  const compact =
    tier !== "standard" ||
    device.coarse ||
    device.cores <= 4 ||
    device.memory <= 4 ||
    !!device.saveData;
  const pixelBudget =
    tier === "software" ? 700_000 : compact ? 1_800_000 : 2_800_000;
  const maxDpr = Math.min(
    device.dpr || 1,
    tier === "software" ? 0.75 : compact ? 1.25 : 1.75,
    Math.sqrt(pixelBudget / Math.max(1, device.width * device.height)),
  );
  return {
    tier,
    maxDpr,
    minDpr: Math.min(maxDpr, tier === "software" ? 0.5 : 0.75),
    geometryQuality: compact ? 0.55 : 1,
    // Multisampling multiplies the cost of every blended full-screen layer.
    // A CPU rasteriser pays it on every pixel; older GPUs pay it per sheet.
    antialias: tier !== "software",
    sheetSamples: tier === "software" ? 0 : tier === "low" ? 2 : 4,
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
    late = 0,
    saturated = false;
  let cooldown = 1200;
  const step = () =>
    Math.max(0.125, Math.ceil(((maxDpr - minDpr) / 3) * 8) / 8);
  return {
    get dpr() {
      return dpr;
    },
    /** Still missing frames at the lowest resolution: shed optional passes. */
    get saturated() {
      return saturated;
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
      // A frame over 20ms has missed a 60Hz vsync: a visible stutter.
      if (ms > 20) late++;
      if (elapsed < 1000) return null;
      const average = elapsed / frames,
        missed = late / frames;
      // Sustained, not transient: below ~50fps with a fifth of frames late.
      const overloaded = average > 20 && missed > 0.2;
      elapsed = frames = late = 0;
      if (!overloaded) return null;
      if (dpr > minDpr) {
        dpr = Math.max(minDpr, Math.round((dpr - step()) * 1000) / 1000);
        // A new resolution needs time to show its real cost before judging again.
        cooldown = 3000;
        return dpr;
      }
      saturated = true;
      return null;
    },
  };
}
