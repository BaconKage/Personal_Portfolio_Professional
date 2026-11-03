import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load() {
  const context = { exports: {}, Math, Number, Array, Float64Array };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL("../lib/voice-analysis.ts", import.meta.url), "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
    context,
  );
  return context.exports;
}
const voice = load();
const RATE = 48000;
const FRAME = 2048;

/** A vowel-like frame: harmonics of `hz` with falling amplitudes. */
function tone(hz, { amplitude = 0.1, harmonics = 1, offset = 0 } = {}) {
  const out = new Float32Array(FRAME);
  for (let i = 0; i < FRAME; i++) {
    const t = (i + offset) / RATE;
    let v = 0;
    for (let h = 1; h <= harmonics; h++) v += Math.sin(2 * Math.PI * hz * h * t) / h;
    out[i] = v * amplitude;
  }
  return out;
}
function noise(amplitude, seed = 7) {
  let s = seed;
  const out = new Float32Array(FRAME);
  for (let i = 0; i < FRAME; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    out[i] = (s / 4294967296 - 0.5) * 2 * amplitude;
  }
  return out;
}
/** An analyser-style dB spectrum with energy at the given frequencies. */
function spectrum(peaks, floorDb = -110) {
  const bins = FRAME / 2;
  const out = new Float32Array(bins).fill(floorDb);
  for (const [hz, db] of peaks) {
    const bin = Math.round(hz / (RATE / FRAME));
    for (let d = -1; d <= 1; d++) if (out[bin + d] !== undefined) out[bin + d] = db - Math.abs(d) * 6;
  }
  return out;
}
const silent = () => new Float32Array(FRAME);
const run = (state, frames, make) => {
  let last;
  for (let i = 0; i < frames; i++) last = make(i, state);
  return last;
};

test("band edges are log-spaced across the voice range, one band per coil", () => {
  const edges = voice.bandEdges();
  assert.equal(edges.length, voice.BANDS + 1);
  assert.equal(edges[0], 80);
  assert.ok(Math.abs(edges.at(-1) - 8000) < 1e-6);
  const ratio = edges[1] / edges[0];
  for (let i = 1; i < edges.length; i++) {
    assert.ok(edges[i] > edges[i - 1]);
    assert.ok(Math.abs(edges[i] / edges[i - 1] - ratio) < 1e-9);
  }
});

test("detects the pitch of a pure tone", () => {
  for (const hz of [90, 150, 220, 330]) {
    const { hz: found, clarity } = voice.detectPitch(tone(hz), RATE);
    assert.ok(Math.abs(found - hz) < hz * 0.01, `${hz} Hz read as ${found}`);
    assert.ok(clarity > 0.95);
  }
});

test("finds the fundamental of a harmonic-rich voice without octave errors", () => {
  const { hz, clarity } = voice.detectPitch(tone(110, { harmonics: 8 }), RATE);
  assert.ok(Math.abs(hz - 110) < 2, `read ${hz}`);
  assert.ok(clarity > 0.9);
});

test("noise and silence are not periodic", () => {
  assert.ok(voice.detectPitch(noise(0.2), RATE).clarity < 0.6);
  const quiet = voice.detectPitch(silent(), RATE);
  assert.equal(quiet.hz, 0);
  assert.equal(quiet.clarity, 0);
});

test("silence produces dark, finite features", () => {
  const state = voice.createAnalysisState();
  const f = run(state, 60, () =>
    voice.analyseFrame(state, new Float32Array(FRAME / 2).fill(-Infinity), silent(), RATE, 1 / 60),
  );
  assert.equal(f.voiced, false);
  assert.equal(f.level, 0);
  assert.equal(f.charge, 0);
  for (const v of [...f.bands, f.centroid, f.flux, f.pitch]) assert.ok(Number.isFinite(v));
  assert.ok(f.bands.every((b) => b === 0));
});

test("a held note charges the core in about 1.4 seconds, then drains in silence", () => {
  const state = voice.createAnalysisState();
  const quiet = () => voice.analyseFrame(state, spectrum([], -105), noise(0.0005), RATE, 1 / 60);
  run(state, 60, quiet);
  const vowel = spectrum([[150, -35], [300, -40], [700, -42], [1200, -48], [2500, -58]]);
  let f, at = 0;
  for (let i = 0; i < 180; i++) {
    f = voice.analyseFrame(state, vowel, tone(150, { amplitude: 0.08, harmonics: 6, offset: i * 800 }), RATE, 1 / 60);
    if (!at && f.charge >= 1) at = (i + 1) / 60;
  }
  assert.ok(f.voiced);
  assert.ok(Math.abs(f.pitch - 150) < 3, `pitch ${f.pitch}`);
  assert.ok(f.level > 0.5, `level ${f.level}`);
  assert.ok(at > 1.3 && at < 1.5, `charged after ${at}s`);
  assert.ok(f.bands[0] > 0.3 && f.bands.slice(0, 5).some((b) => b > 0.5), `bands ${f.bands}`);
  assert.ok(f.centroid > 150 && f.centroid < 2500, `centroid ${f.centroid}`);
  const after = run(state, 90, quiet);
  assert.equal(after.voiced, false);
  assert.ok(after.charge < 0.5 && after.charge > 0.3, `charge ${after.charge}`);
  assert.ok(after.level < 0.05);
});

test("a held note is never absorbed into the noise floor", () => {
  const state = voice.createAnalysisState();
  const vowel = spectrum([[200, -38]]);
  const f = run(state, 600, (i) =>
    voice.analyseFrame(state, vowel, tone(200, { amplitude: 0.05, harmonics: 4, offset: i * 800 }), RATE, 1 / 60),
  );
  assert.ok(f.voiced && f.level > 0.4, `level ${f.level} after 10s`);
});

test("steady background noise fades out; speech over it still registers", () => {
  const state = voice.createAnalysisState();
  const hum = spectrum([[500, -60], [3000, -62]], -80);
  const background = run(state, 900, (i) => voice.analyseFrame(state, hum, noise(0.01, i + 1), RATE, 1 / 60));
  assert.equal(background.voiced, false);
  assert.ok(background.level < 0.1, `background level ${background.level}`);
  const speech = run(state, 20, (i) => {
    const frame = tone(180, { amplitude: 0.1, harmonics: 5, offset: i * 800 });
    const n = noise(0.01, i + 99);
    for (let k = 0; k < FRAME; k++) frame[k] += n[k];
    return voice.analyseFrame(state, spectrum([[180, -34], [360, -40]], -80), frame, RATE, 1 / 60);
  });
  assert.ok(speech.voiced && speech.level > 0.3, `speech level ${speech.level}`);
});

test("spectral flux rises when the spectrum changes and settles when it holds", () => {
  const state = voice.createAnalysisState();
  const a = spectrum([[200, -35], [800, -45]]);
  const b = spectrum([[300, -35], [2400, -45]]);
  const signal = (i) => tone(200, { amplitude: 0.08, harmonics: 4, offset: i * 800 });
  const changing = run(state, 40, (i) => voice.analyseFrame(state, i % 2 ? a : b, signal(i), RATE, 1 / 60));
  const steady = run(state, 60, (i) => voice.analyseFrame(state, a, signal(i), RATE, 1 / 60));
  assert.ok(changing.flux > 0.4, `changing ${changing.flux}`);
  assert.ok(steady.flux < 0.05, `steady ${steady.flux}`);
});
