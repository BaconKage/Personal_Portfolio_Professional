/** Shared by the semantic controls and the GPU scene; no per-frame React state. */
export type CorePhase = "idle" | "charging" | "online" | "cooling";
export type CoreSample = {
  energy: number;
  coils: number;
  spin: number;
  flash: number;
};
export type CoreState = {
  phase: CorePhase;
  startedAt: number;
  /** Cooling from a charge that was let go: where it had got to. */
  from?: CoreSample;
  /** How long this cooling takes, when it is not the full power-down. */
  duration?: number;
};
export const CORE_TIMING = {
  charging: 2600,
  /** How long the ignition flash takes to settle once online. */
  flash: 900,
  cooling: 1800,
};
const resting: CoreState = { phase: "idle", startedAt: 0 };
let state = resting;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

export const getCoreState = () => state;
export const getServerCoreState = () => resting;
export function subscribeCore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function enter(phase: CorePhase, extra?: Pick<CoreState, "from" | "duration">) {
  clearTimeout(timer);
  state = { phase, startedAt: performance.now(), ...extra };
  listeners.forEach((listener) => listener());
  if (phase === "charging")
    timer = setTimeout(() => enter("online"), CORE_TIMING.charging);
  else if (phase === "cooling")
    timer = setTimeout(
      () => enter("idle"),
      extra?.duration ?? CORE_TIMING.cooling,
    );
}
/** Energise from rest, or power down once online. Mid-transition clicks wait. */
export function activateCore() {
  if (state.phase === "idle") enter("charging");
  else if (state.phase === "online") enter("cooling");
}
/** Begin charging, from rest only: the start of a press-and-hold. */
export function chargeCore() {
  if (state.phase === "idle") enter("charging");
}
/**
 * Let go of a charge before it fires. The core winds down from wherever it
 * had got to, faster the less it had built. Once online this does nothing:
 * a held charge that completed stays on.
 */
export function releaseCore() {
  if (state.phase !== "charging") return;
  const from = sampleCore(state, performance.now());
  enter("cooling", {
    from,
    duration: 450 + CORE_TIMING.cooling * 0.6 * from.energy,
  });
}
export function resetCore() {
  clearTimeout(timer);
  state = resting;
  listeners.forEach((listener) => listener());
}
const smooth = (a: number, b: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/**
 * energy: overall power (light output). coils: fraction of the coil ring lit,
 * in order. spin: HUD ring speed. flash: the ignition burst, 1 at the instant
 * the core comes online. Endpoints are continuous, so timer handoffs never snap.
 */
export function sampleCore(
  { phase, startedAt, from, duration }: CoreState,
  now: number,
): CoreSample {
  const elapsed = Math.max(0, now - startedAt);
  if (phase === "charging") {
    const p = Math.min(1, elapsed / CORE_TIMING.charging);
    return {
      energy: smooth(0.05, 1, p) * 0.72 + smooth(0.9, 1, p) * 0.28,
      coils: smooth(0, 0.78, p),
      spin: smooth(0, 1, p),
      flash: smooth(0.88, 1, p),
    };
  }
  if (phase === "online") {
    const p = Math.min(1, elapsed / CORE_TIMING.flash);
    return { energy: 1, coils: 1, spin: 1, flash: 1 - smooth(0, 1, p) };
  }
  if (phase === "cooling") {
    const p = Math.min(1, elapsed / (duration ?? CORE_TIMING.cooling));
    // A full power-down starts from everything lit; a released charge
    // starts from where it was, so letting go never snaps.
    const start = from ?? { energy: 1, coils: 1, spin: 1, flash: 0 };
    return {
      energy: start.energy * (1 - smooth(0, 1, p)),
      coils: start.coils * (1 - smooth(0.1, 0.9, p)),
      spin: start.spin * (1 - smooth(0, 1, p)),
      flash: start.flash * (1 - smooth(0, 0.5, p)),
    };
  }
  return { energy: 0, coils: 0, spin: 0, flash: 0 };
}
