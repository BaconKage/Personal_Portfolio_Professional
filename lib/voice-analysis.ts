/**
 * Voice features for the hero core, computed from one analyser frame.
 *
 * Pure functions with no Web Audio, so the maths runs in Node tests too.
 * Pitch uses McLeod's normalised square-difference function; voice activity
 * combines loudness above an adaptive noise floor with periodicity. These
 * are live signal readings for an illustration, not a speech classifier or
 * an authenticity verdict.
 */
export const BANDS = 10;
export const MIN_HZ = 80;
export const MAX_HZ = 8000;
/** Seconds of continuous voice that fully charge the core. */
export const CHARGE_SECONDS = 1.4;
/** Seconds for a full charge to drain away in silence. */
export const DRAIN_SECONDS = 2.5;

export type VoiceFeatures = {
  /** Loudness above the room's noise floor, 0..1. */
  level: number;
  /** Energy per log-spaced band, low to high, 0..1. One per coil. */
  bands: number[];
  /** Spectral centroid in Hz: where the "brightness" of the sound sits. */
  centroid: number;
  /** Spectral flux, 0..1: how quickly the spectrum is changing. */
  flux: number;
  /** Fundamental frequency in Hz while voiced, otherwise the last value. */
  pitch: number;
  voiced: boolean;
  /** Sustained-voice accumulator, 0..1. */
  charge: number;
};

export type AnalysisState = {
  floor: number;
  level: number;
  bands: number[];
  centroid: number;
  flux: number;
  pitch: number;
  charge: number;
  previous: Float64Array | null;
};

export const createAnalysisState = (): AnalysisState => ({
  floor: -60,
  level: 0,
  bands: new Array(BANDS).fill(0),
  centroid: 0,
  flux: 0,
  pitch: 0,
  charge: 0,
  previous: null,
});

export function bandEdges(n = BANDS, min = MIN_HZ, max = MAX_HZ) {
  return Array.from(
    { length: n + 1 },
    (_, i) => min * Math.pow(max / min, i / n),
  );
}
const EDGES = bandEdges();

const clamp01 = (x: number) => (x > 1 ? 1 : x > 0 ? x : 0);
/** Frame-rate independent exponential approach. */
const damp = (current: number, target: number, rate: number, dt: number) =>
  target + (current - target) * Math.exp(-rate * dt);

/**
 * Fundamental frequency by normalised square difference. Input is first
 * averaged down to about 16 kHz (plenty for a voice's fundamental), which
 * keeps a 2048-sample frame cheap enough for every animation frame on a phone.
 */
export function detectPitch(
  input: ArrayLike<number>,
  sampleRate: number,
  minHz = 70,
  maxHz = 450,
) {
  let samples: ArrayLike<number> = input;
  const factor = Math.max(1, Math.floor(sampleRate / 16000));
  const rate = sampleRate / factor;
  if (factor > 1) {
    const reduced = new Float64Array(Math.floor(input.length / factor));
    for (let i = 0; i < reduced.length; i++) {
      let sum = 0;
      for (let k = 0; k < factor; k++) sum += input[i * factor + k];
      reduced[i] = sum / factor;
    }
    samples = reduced;
  }
  const minLag = Math.max(2, Math.floor(rate / maxHz));
  const maxLag = Math.min(
    Math.ceil(rate / minHz),
    Math.floor(samples.length / 2),
  );
  const size = samples.length - maxLag;
  if (size <= 0 || minLag >= maxLag) return { hz: 0, clarity: 0 };

  const nsdf = new Float64Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let acf = 0,
      energy = 0;
    for (let i = 0; i < size; i++) {
      const a = samples[i],
        b = samples[i + lag];
      acf += a * b;
      energy += a * a + b * b;
    }
    nsdf[lag] = energy > 1e-12 ? (2 * acf) / energy : 0;
  }

  // Key maxima: the highest point of each positive lobe after the first
  // negative crossing. The first one near the global best avoids octave errors.
  const peaks: number[] = [];
  let lag = 1;
  while (lag < maxLag && nsdf[lag] > 0) lag++;
  let best = -1;
  for (; lag < maxLag; lag++) {
    if (nsdf[lag] > 0) {
      if (best < 0 || nsdf[lag] > nsdf[best]) best = lag;
    } else if (best >= 0) {
      peaks.push(best);
      best = -1;
    }
  }
  if (best >= 0) peaks.push(best);
  const usable = peaks.filter((p) => p >= minLag);
  if (!usable.length) return { hz: 0, clarity: 0 };
  const top = Math.max(...usable.map((p) => nsdf[p]));
  const chosen = usable.find((p) => nsdf[p] >= top * 0.9) ?? usable[0];
  const a = nsdf[chosen - 1],
    b = nsdf[chosen],
    c = nsdf[chosen + 1] ?? b;
  const curve = a - 2 * b + c;
  const shift = curve !== 0 ? (0.5 * (a - c)) / curve : 0;
  return { hz: rate / (chosen + shift), clarity: b };
}

/**
 * One analyser frame in, smoothed features out. `spectrumDb` is
 * AnalyserNode.getFloatFrequencyData output; `samples` is the matching
 * time-domain frame.
 */
export function analyseFrame(
  state: AnalysisState,
  spectrumDb: ArrayLike<number>,
  samples: ArrayLike<number>,
  sampleRate: number,
  dt: number,
): VoiceFeatures {
  dt = Math.min(Math.max(dt, 0), 0.1);

  // Loudness and periodicity from the waveform.
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  const rms = samples.length ? Math.sqrt(sum / samples.length) : 0;
  const db = rms > 1e-7 ? 20 * Math.log10(rms) : -140;
  const { hz, clarity } = detectPitch(samples, sampleRate);
  const voiced = db > state.floor + 9 && clarity > 0.8 && hz > 0;

  // The noise floor drops straight to quieter input, and only creeps up
  // through unvoiced sound, so a held note is never mistaken for the room.
  if (db < state.floor) state.floor = db;
  else if (!voiced) state.floor = Math.min(db, state.floor + dt * 1.2);
  state.floor = Math.min(-25, Math.max(-90, state.floor));

  const loud = clamp01((db - state.floor - 6) / 30);
  state.level = damp(state.level, loud, loud > state.level ? 30 : 7, dt);
  const gate = clamp01(state.level * 2.5);

  // Spectrum: linear power per log band, with a gentle upward tilt so the
  // higher coils still answer to ordinary speech.
  const bins = spectrumDb.length;
  const binHz = sampleRate / (2 * bins);
  const first = Math.max(1, Math.floor(MIN_HZ / binHz));
  const last = Math.min(bins - 1, Math.ceil(MAX_HZ / binHz));
  const span = Math.max(0, last - first + 1);
  if (!state.previous || state.previous.length !== span)
    state.previous = new Float64Array(span);
  let weighted = 0,
    total = 0,
    change = 0;
  const magnitudes = new Float64Array(span);
  for (let i = first; i <= last; i++) {
    const value = spectrumDb[i];
    const magnitude = Number.isFinite(value) ? Math.pow(10, value / 20) : 0;
    magnitudes[i - first] = magnitude;
    weighted += magnitude * i * binHz;
    total += magnitude;
  }
  for (let i = 0; i < span; i++) {
    const normal = total > 0 ? magnitudes[i] / total : 0;
    if (normal > state.previous[i]) change += normal - state.previous[i];
    state.previous[i] = normal;
  }

  for (let b = 0; b < BANDS; b++) {
    const lo = Math.max(first, Math.floor(EDGES[b] / binHz));
    const hi = Math.min(
      last,
      Math.max(lo, Math.ceil(EDGES[b + 1] / binHz) - 1),
    );
    let power = 0;
    for (let i = lo; i <= hi; i++) {
      const value = spectrumDb[i];
      if (Number.isFinite(value)) power += Math.pow(10, value / 10);
    }
    const bandDb = power > 0 ? 10 * Math.log10(power / (hi - lo + 1)) : -140;
    const centre = Math.sqrt(EDGES[b] * EDGES[b + 1]);
    const tilt = 4 * Math.log2(centre / 300);
    const target = clamp01((bandDb + tilt + 85) / 50) * gate;
    state.bands[b] = damp(
      state.bands[b],
      target,
      target > state.bands[b] ? 28 : 8,
      dt,
    );
  }

  if (total > 0 && gate > 0.1)
    state.centroid = state.centroid
      ? damp(state.centroid, weighted / total, 10, dt)
      : weighted / total;
  state.flux = damp(state.flux, clamp01(change * 2.5) * gate, 12, dt);
  if (voiced) state.pitch = state.pitch ? damp(state.pitch, hz, 18, dt) : hz;
  state.charge = voiced
    ? Math.min(1, state.charge + dt / CHARGE_SECONDS)
    : Math.max(0, state.charge - dt / DRAIN_SECONDS);

  return {
    level: state.level,
    bands: state.bands,
    centroid: state.centroid,
    flux: state.flux,
    pitch: state.pitch,
    voiced,
    charge: state.charge,
  };
}
