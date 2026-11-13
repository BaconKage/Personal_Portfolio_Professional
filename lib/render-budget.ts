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

/** Never ask for more than 60fps; never excuse less than a 30Hz cap. */
const FASTEST_INTERVAL = 1000 / 60;
const SLOWEST_INTERVAL = 34;
const CALIBRATION_FRAMES = 9;

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
  // The cadence the browser delivers frames at when nothing is drawn. Energy
  // saver, battery modes and some displays cap it at 30Hz: a cap is not
  // load, and lowering resolution cannot buy back a single frame of it.
  let interval = FASTEST_INTERVAL;
  const idle: number[] = [];
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
    /** The frame interval frames are judged against, in ms. */
    get interval() {
      return interval;
    },
    reset() {
      elapsed = frames = late = 0;
      cooldown = Math.max(cooldown, 1200);
    },
    /**
     * Feed the time between two frames in which nothing was drawn. Their
     * median is the display's own cadence: late frames only lengthen a few
     * samples, and the catch-up frames after them only shorten a few.
     */
    calibrate(ms: number) {
      if (!Number.isFinite(ms) || ms <= 0 || ms > 250) {
        idle.length = 0;
        return;
      }
      idle.push(ms);
      if (idle.length < CALIBRATION_FRAMES) return;
      const median = idle.sort((a, b) => a - b)[CALIBRATION_FRAMES >> 1];
      idle.length = 0;
      const next = Math.min(
        SLOWEST_INTERVAL,
        Math.max(FASTEST_INTERVAL, median),
      );
      // A changed cadence makes the frames gathered so far incomparable.
      if (Math.abs(next - interval) > 2) elapsed = frames = late = 0;
      interval = next;
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
      // A frame a fifth over the display's interval has missed a vsync (20ms
      // at 60Hz): a visible stutter.
      const limit = interval * 1.2;
      if (ms > limit) late++;
      if (elapsed < 1000) return null;
      const average = elapsed / frames,
        missed = late / frames;
      // Sustained, not transient: a fifth slower than the display delivers
      // (below ~50fps at 60Hz), with a fifth of frames late.
      const overloaded = average > limit && missed > 0.2;
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
