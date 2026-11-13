import type { CorePhase } from "./core-sequence";

/**
 * Interface sound, synthesised with Web Audio: no audio files, nothing to
 * download. Off until the reader turns it on (browsers require a gesture to
 * start audio anyway); the choice is remembered.
 *
 * The reactor is the instrument. Charging winds a filtered hum up through a
 * riser, ignition is a thump with a bright tail, online is a low sustained
 * hum that recedes as the hero scrolls away, and cooling winds it down.
 * Small ticks and sweeps answer hovers, presses, the menu and page changes.
 *
 * Tuned for laptop speakers, which reproduce little below ~150Hz: the hum's
 * weight comes from its harmonics, not its fundamental.
 */

const KEY = "portfolio-sound";
/** Flip to true to start with sound on for first-time visitors. */
const DEFAULT_ON = false;
const CHARGE_SECONDS = 2.6;
const COOL_SECONDS = 1.8;

let enabled = false;
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let send: GainNode | null = null;
let noise: AudioBuffer | null = null;
let phase: CorePhase = "idle";
let presence = 1;
let lastTick = 0;
const listeners = new Set<() => void>();

type Hum = {
  a: OscillatorNode;
  b: OscillatorNode;
  filter: BiquadFilterNode;
  level: GainNode;
  stutter: GainNode;
  presence: GainNode;
};
let hum: Hum | null = null;

export const getSoundEnabled = () => enabled;
export const getServerSoundEnabled = () => false;
export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function build() {
  if (ctx) return ctx;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) return null;
  try {
    ctx = new AudioCtor({ latencyHint: "interactive" });
  } catch {
    return null;
  }
  // A limiter keeps stacked voices (ignition over a hover) from clipping.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.knee.value = 10;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  out = ctx.createGain();
  out.gain.value = 0;
  out.connect(limiter).connect(ctx.destination);
  // A short, dark feedback echo stands in for a room.
  send = ctx.createGain();
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.21;
  const damp = ctx.createBiquadFilter();
  damp.type = "lowpass";
  damp.frequency.value = 2200;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.34;
  const wet = ctx.createGain();
  wet.gain.value = 0.3;
  send.connect(delay).connect(damp).connect(feedback).connect(delay);
  damp.connect(wet).connect(out);
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

/** The context, only while sound is on and actually running. */
function live() {
  return enabled && ctx && out && ctx.state === "running" ? ctx : null;
}

/** Stop a parameter where it is, so a new ramp starts without a jump. */
function hold(param: AudioParam, t: number) {
  if (typeof param.cancelAndHoldAtTime === "function")
    param.cancelAndHoldAtTime(t);
  else {
    const value = param.value;
    param.cancelScheduledValues(t);
    param.setValueAtTime(value, t);
  }
}

/** A one-shot oscillator with a pitch glide and a percussive envelope. */
function blip(
  c: AudioContext,
  {
    type = "sine",
    from,
    to = from,
    peak,
    attack = 0.004,
    decay,
    glide = decay,
    delay = 0,
    wet = 0,
  }: {
    type?: OscillatorType;
    from: number;
    to?: number;
    peak: number;
    attack?: number;
    decay: number;
    /** How long the pitch takes to travel from `from` to `to`. */
    glide?: number;
    delay?: number;
    wet?: number;
  },
) {
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + glide);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  osc.connect(gain).connect(out!);
  if (wet && send) {
    const tap = c.createGain();
    tap.gain.value = wet;
    gain.connect(tap).connect(send);
  }
  osc.start(t);
  osc.stop(t + attack + decay + 0.05);
}

/** Filtered noise sweeping between two frequencies: air moving. */
function sweep(
  c: AudioContext,
  {
    type = "bandpass",
    from,
    to,
    peak,
    attack,
    decay,
    q = 0.9,
    delay = 0,
    wet = 0.4,
  }: {
    type?: BiquadFilterType;
    from: number;
    to: number;
    peak: number;
    attack: number;
    decay: number;
    q?: number;
    delay?: number;
    wet?: number;
  },
) {
  const t = c.currentTime + delay;
  const source = c.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  source.connect(filter).connect(gain).connect(out!);
  if (wet && send) {
    const tap = c.createGain();
    tap.gain.value = wet;
    gain.connect(tap).connect(send);
  }
  source.start(t, Math.random());
  source.stop(t + attack + decay + 0.05);
}

/** A light tick as the pointer reaches something interactive. */
export function playTick() {
  const c = live();
  if (!c) return;
  const now = performance.now();
  if (now - lastTick < 55) return;
  lastTick = now;
  blip(c, {
    from: 2300 + Math.random() * 500,
    to: 1100,
    peak: 0.05,
    attack: 0.003,
    decay: 0.045,
  });
}

/** A soft, lower knock on press. */
export function playPress() {
  const c = live();
  if (!c) return;
  blip(c, { type: "triangle", from: 520, to: 190, peak: 0.1, decay: 0.09 });
  blip(c, { from: 3200, to: 1800, peak: 0.025, decay: 0.03 });
}

/** Air: the menu opening or closing, and travelling to another page. */
export function playWhoosh(kind: "open" | "close" | "travel") {
  const c = live();
  if (!c) return;
  if (kind === "open")
    sweep(c, { from: 320, to: 2600, peak: 0.075, attack: 0.3, decay: 0.45 });
  else if (kind === "close")
    sweep(c, { from: 2400, to: 300, peak: 0.06, attack: 0.08, decay: 0.4 });
  else {
    sweep(c, { from: 220, to: 4200, peak: 0.085, attack: 0.55, decay: 0.6 });
    blip(c, {
      from: 196,
      to: 392,
      peak: 0.022,
      attack: 0.5,
      decay: 0.5,
      glide: 1,
      wet: 1,
    });
  }
}

function chime(c: AudioContext) {
  blip(c, { from: 880, peak: 0.07, decay: 0.5, wet: 0.8 });
  blip(c, { from: 1318.5, peak: 0.055, decay: 0.6, delay: 0.07, wet: 0.8 });
}

function makeHum(c: AudioContext): Hum {
  const a = c.createOscillator(),
    b = c.createOscillator();
  a.type = b.type = "sawtooth";
  // Two voices a few cents apart beat slowly against each other.
  b.detune.value = 11;
  const mix = c.createGain();
  mix.gain.value = 0.5;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 5;
  const level = c.createGain();
  level.gain.value = 0.0001;
  const stutter = c.createGain();
  const near = c.createGain();
  near.gain.value = presence;
  a.connect(mix);
  b.connect(mix);
  mix.connect(filter).connect(level).connect(stutter).connect(near);
  near.connect(out!);
  a.start();
  b.start();
  return { a, b, filter, level, stutter, presence: near };
}

function releaseHum(c: AudioContext, seconds: number) {
  const h = hum;
  if (!h) return;
  hum = null;
  const t = c.currentTime;
  hold(h.level.gain, t);
  h.level.gain.setTargetAtTime(0.0001, t, seconds / 4);
  h.a.stop(t + seconds + 0.3);
  h.b.stop(t + seconds + 0.3);
}

function applyPhase(previous: CorePhase) {
  const c = live();
  if (!c) return;
  const t = c.currentTime;
  if (phase === "idle") {
    releaseHum(c, 0.2);
    return;
  }
  if (!hum) hum = makeHum(c);
  const h = hum;
  for (const param of [
    h.a.frequency,
    h.b.frequency,
    h.filter.frequency,
    h.level.gain,
  ])
    hold(param, t);
  h.stutter.gain.cancelScheduledValues(t);
  h.stutter.gain.setValueAtTime(1, t);

  if (phase === "charging") {
    const end = t + CHARGE_SECONDS;
    for (const osc of [h.a, h.b]) {
      osc.frequency.setValueAtTime(46, t);
      osc.frequency.exponentialRampToValueAtTime(98, end);
    }
    h.filter.frequency.setValueAtTime(160, t);
    h.filter.frequency.exponentialRampToValueAtTime(1500, end);
    // Audible from the first moment, then a long build: an exponential ramp
    // alone would spend the first half of the charge below hearing.
    h.level.gain.setValueAtTime(0.0001, t);
    h.level.gain.exponentialRampToValueAtTime(0.035, t + 0.3);
    h.level.gain.linearRampToValueAtTime(0.16, end - 0.1);
    // The output stutters before it fires, as the light does.
    for (const at of [0.64, 0.7, 0.77, 0.82, 0.88, 0.92]) {
      const dip = t + CHARGE_SECONDS * at;
      h.stutter.gain.setValueAtTime(0.3, dip);
      h.stutter.gain.setValueAtTime(1, dip + 0.045);
    }
    // A rising tone and rising air over the hum, cut just before ignition.
    blip(c, {
      from: 196,
      to: 784,
      peak: 0.03,
      attack: CHARGE_SECONDS - 0.1,
      decay: 0.08,
      glide: CHARGE_SECONDS,
      wet: 0.6,
    });
    sweep(c, {
      from: 500,
      to: 5200,
      peak: 0.045,
      attack: CHARGE_SECONDS - 0.08,
      decay: 0.06,
      q: 1.4,
    });
    return;
  }

  if (phase === "online") {
    for (const osc of [h.a, h.b]) osc.frequency.setTargetAtTime(73.4, t, 0.3);
    h.filter.frequency.setTargetAtTime(520, t, 0.5);
    h.level.gain.setTargetAtTime(0.055, t, 0.45);
    // Only a real ignition fires; turning sound on mid-way just joins the hum.
    if (previous !== "charging") return;
    blip(c, { from: 190, to: 48, peak: 0.6, decay: 0.6 });
    blip(c, { type: "triangle", from: 380, to: 110, peak: 0.24, decay: 0.34 });
    sweep(c, {
      type: "highpass",
      from: 2400,
      to: 900,
      peak: 0.2,
      attack: 0.004,
      decay: 0.28,
      wet: 0.7,
    });
    // D, A, D: an open fifth ringing off the flash.
    [1174.66, 1760, 2349.32].forEach((frequency, i) =>
      blip(c, {
        from: frequency,
        peak: 0.03 - i * 0.006,
        decay: 2.1,
        delay: i * 0.035,
        wet: 1,
      }),
    );
    sweep(c, {
      from: 3200,
      to: 280,
      peak: 0.06,
      attack: 0.05,
      decay: 1.4,
      delay: 0.05,
    });
    return;
  }

  // Cooling: everything winds down to nothing.
  const end = t + COOL_SECONDS;
  for (const osc of [h.a, h.b])
    osc.frequency.exponentialRampToValueAtTime(34, end);
  h.filter.frequency.exponentialRampToValueAtTime(110, end);
  h.level.gain.exponentialRampToValueAtTime(0.0001, end);
  blip(c, {
    from: 392,
    to: 98,
    peak: 0.028,
    attack: 0.05,
    decay: 1.5,
    wet: 0.7,
  });
  sweep(c, { from: 1800, to: 200, peak: 0.04, attack: 0.1, decay: 1.4 });
  h.a.stop(end + 0.3);
  h.b.stop(end + 0.3);
  hum = null;
}

/** Follow the reactor's power state. */
export function setCorePhase(next: CorePhase) {
  if (next === phase) return;
  const previous = phase;
  phase = next;
  applyPhase(previous);
}

/** How near the reader is to the reactor, 0..1: the hum recedes with it. */
export function setCorePresence(value: number) {
  presence = Math.max(0, Math.min(1, value));
  const c = live();
  if (c && hum) hum.presence.gain.setTargetAtTime(presence, c.currentTime, 0.25);
}

function wake(announce: boolean) {
  const c = build();
  if (!c || !out) return;
  void c
    .resume()
    .then(() => {
      if (!enabled || !out) return;
      out.gain.setTargetAtTime(0.9, c.currentTime, 0.05);
      if (announce) chime(c);
      // Join whatever the reactor is doing right now.
      if (phase !== "idle" && !hum) applyPhase(phase);
    })
    .catch(() => {});
}

/** Turn sound on or off, from a click. The choice is remembered. */
export function setSoundEnabled(on: boolean) {
  if (on === enabled) return;
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  if (on) wake(true);
  else if (ctx && out) {
    const c = ctx;
    out.gain.setTargetAtTime(0, c.currentTime, 0.04);
    releaseHum(c, 0.2);
    setTimeout(() => {
      if (!enabled) void c.suspend().catch(() => {});
    }, 400);
  }
  listeners.forEach((listener) => listener());
}

/**
 * Restore the remembered choice. Audio cannot start before a gesture, so a
 * remembered "on" waits for the first press or key. Returns a cleanup.
 */
export function initSound() {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {}
  const on = stored ? stored === "on" : DEFAULT_ON;
  if (on !== enabled) {
    enabled = on;
    listeners.forEach((listener) => listener());
  }
  const unlock = () => {
    if (enabled && (!ctx || ctx.state !== "running")) wake(false);
  };
  // A hidden page makes no sound and spends no audio time.
  const visibility = () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend().catch(() => {});
    else if (enabled) wake(false);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("keydown", unlock, true);
  document.addEventListener("visibilitychange", visibility);
  return () => {
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    document.removeEventListener("visibilitychange", visibility);
  };
}
