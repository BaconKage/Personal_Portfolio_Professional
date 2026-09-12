/** Shared by the semantic controls and the GPU scene; no per-frame React state. */
export type CorePhase =
  "idle" | "charging" | "dispersing" | "stars" | "reforming";
export type CoreState = { phase: CorePhase; startedAt: number };
export const CORE_TIMING = {
  charging: 2200,
  dispersing: 2800,
  reforming: 3200,
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
function enter(phase: CorePhase) {
  clearTimeout(timer);
  state = { phase, startedAt: performance.now() };
  listeners.forEach((listener) => listener());
  if (phase === "charging")
    timer = setTimeout(() => enter("dispersing"), CORE_TIMING.charging);
  else if (phase === "dispersing")
    timer = setTimeout(() => enter("stars"), CORE_TIMING.dispersing);
  else if (phase === "reforming")
    timer = setTimeout(() => enter("idle"), CORE_TIMING.reforming);
}
export function activateCore() {
  if (state.phase === "idle") enter("charging");
  else if (state.phase === "stars") enter("reforming");
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

/** Continuous endpoints keep timer/renderer handoffs invisible, even after a hidden tab. */
export function sampleCore({ phase, startedAt }: CoreState, now: number) {
  const elapsed = Math.max(0, now - startedAt);
  if (phase === "charging") {
    const energy = smooth(0, 1, elapsed / CORE_TIMING.charging);
    return { energy, spread: 0, surface: 1, stars: energy * 0.32 };
  }
  if (phase === "dispersing") {
    const p = Math.min(1, elapsed / CORE_TIMING.dispersing);
    return {
      energy: 1 - smooth(0, 0.65, p),
      spread: 1 - Math.pow(1 - p, 3),
      surface: 1 - smooth(0, 0.26, p),
      stars: 0.32 + 0.68 * smooth(0, 0.12, p),
    };
  }
  if (phase === "stars") return { energy: 0, spread: 1, surface: 0, stars: 1 };
  if (phase === "reforming") {
    const p = Math.min(1, elapsed / CORE_TIMING.reforming);
    return {
      energy: Math.sin(p * Math.PI) * 0.65,
      spread: 1 - smooth(0, 0.86, p),
      surface: smooth(0.62, 1, p),
      stars: 1 - smooth(0.72, 1, p),
    };
  }
  return { energy: 0, spread: 0, surface: 1, stars: 0 };
}
