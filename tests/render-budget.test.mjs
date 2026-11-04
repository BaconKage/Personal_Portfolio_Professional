import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../lib/render-budget.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { createRenderBudget, getRenderProfile } = context.exports;
const run = (budget, ms, frames) => { for (let i = 0; i < frames; i++) budget.sample(ms); };

test("High-DPI phones and 4K displays stay within their pixel budgets", () => {
  for (const device of [
    { width: 390, height: 844, dpr: 3, coarse: true, cores: 6, memory: 4 },
    { width: 3840, height: 2160, dpr: 2, coarse: false, cores: 12, memory: 16 },
    { width: 768, height: 1024, dpr: 2, coarse: true, cores: 4, memory: 4 },
  ]) {
    const p = getRenderProfile(device);
    const pixels = device.width * device.height * p.maxDpr ** 2;
    assert.ok(pixels <= (device.coarse ? 1_800_000 : 2_800_000) + 1);
    assert.ok(p.maxDpr <= device.dpr && p.minDpr <= p.maxDpr);
    assert.ok(p.geometryQuality > 0, "Effects must stay enabled on compact devices");
  }
});
test("Sustained missed frames lower resolution in few steps and never oscillate", () => {
  const budget = createRenderBudget(1.75, .75);
  const changes = [];
  for (let i = 0; i < 240; i++) {
    const next = budget.sample(33.3);
    if (next !== null) changes.push(next);
  }
  const lower = budget.dpr;
  assert.ok(lower < 1.75 && lower >= .75);
  assert.ok(changes.length <= 2, "Each buffer reallocation is a hitch; keep them rare");
  run(budget, 16.67, 3000);
  assert.equal(budget.dpr, lower, "Recovered frame time must not bounce quality back up");
});
test("Fast displays, initial shader work, and hidden-tab gaps do not downgrade quality", () => {
  const budget = createRenderBudget(1.5, .75);
  run(budget, 100, 10);
  run(budget, 8.33, 1000);
  budget.sample(30_000);
  run(budget, 16.67, 300);
  assert.equal(budget.dpr, 1.5);
});
test("Resolution stays bounded during prolonged load, resizing, and preference resets", () => {
  const budget = createRenderBudget(1.75, .75);
  run(budget, 45, 3000);
  assert.equal(budget.dpr, .75);
  assert.equal(budget.resize(.6, .6), .6);
  run(budget, 16.67, 1000);
  assert.equal(budget.dpr, .6);
  budget.reset();
  budget.sample(Infinity);
  assert.equal(budget.dpr, .6);
});
test("GPU class sets the starting budget before any frame is measured", () => {
  const { getGpuTier } = context.exports;
  const screen = { width: 1440, height: 900, dpr: 2, coarse: false, cores: 8, memory: 8 };
  assert.equal(getGpuTier("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)"), "software");
  assert.equal(getGpuTier("ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)"), "low");
  assert.equal(getGpuTier("Mali-G52 MC2"), "low");
  assert.equal(getGpuTier("Adreno (TM) 506"), "low");
  for (const gpu of ["ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)", "Apple GPU", "Adreno (TM) 740", "Mali-G78", "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)", ""])
    assert.equal(getGpuTier(gpu), "standard", gpu);
  const software = getRenderProfile({ ...screen, gpu: "SwiftShader" });
  assert.ok(software.maxDpr <= 0.75 && software.minDpr <= software.maxDpr);
  assert.equal(software.antialias, false);
  assert.equal(software.sheetSamples, 0);
  const low = getRenderProfile({ ...screen, gpu: "Intel(R) HD Graphics 4000" });
  assert.ok(low.maxDpr <= 1.25 && low.geometryQuality < 1 && low.sheetSamples === 2);
  const standard = getRenderProfile({ ...screen, gpu: "Apple GPU" });
  assert.ok(standard.maxDpr > low.maxDpr && standard.antialias && standard.sheetSamples === 4);
  assert.ok(software.geometryQuality > 0, "Effects must stay enabled on every tier");
});
/** Feeds frames until `until(budget)` or the time runs out; returns elapsed ms. */
const runUntil = (budget, frame, until, limitMs = 600_000) => {
  let t = 0;
  while (t < limitMs && !until(budget)) {
    const ms = typeof frame === "function" ? frame(budget) : frame;
    budget.sample(ms);
    t += ms;
  }
  return t;
};
/** Share of time the optional pass is shed over `seconds` of frames. */
const shedShare = (budget, frame, seconds) => {
  let t = 0, off = 0;
  while (t < seconds * 1000) {
    const ms = frame(budget, t);
    budget.sample(ms);
    t += ms;
    if (budget.saturated) off += ms;
  }
  return off / t;
};

test("Only sustained misses at the lowest resolution shed optional passes", () => {
  const budget = createRenderBudget(1.25, 0.75);
  run(budget, 16.67, 3000);
  run(budget, 45, 40);
  run(budget, 16.67, 1000);
  assert.equal(budget.saturated, false, "A burst of slow frames never sheds passes");
  runUntil(budget, 40, (b) => b.saturated);
  assert.equal(budget.saturated, true);
  assert.equal(budget.dpr, 0.75, "Resolution goes first; passes are shed only at the floor");
});
test("A shed pass comes back when dropping it does not help", () => {
  // Frames stay slow with the trail off (a 30fps cap, or load elsewhere).
  const budget = createRenderBudget(1.25, 0.75);
  runUntil(budget, 33.3, (b) => b.saturated);
  const back = runUntil(budget, 33.3, (b) => !b.saturated);
  assert.ok(back <= 2_000, `restored after ${back}ms`);
  const share = shedShare(budget, () => 33.3, 600);
  assert.ok(share < 0.02, `a frame-rate cap hid the trail ${(share * 100).toFixed(1)}% of the time`);
});
test("A pass that really costs too much stays off, retried with growing waits", () => {
  // The trail is the cost: 40ms frames with it, 16.7ms without.
  const budget = createRenderBudget(1.25, 0.75);
  const frame = (b) => (b.saturated ? 16.67 : 40);
  runUntil(budget, frame, (b) => b.saturated);
  const waits = [];
  for (let i = 0; i < 4; i++) {
    waits.push(runUntil(budget, frame, (b) => !b.saturated));
    runUntil(budget, frame, (b) => b.saturated);
  }
  for (let i = 1; i < waits.length; i++)
    assert.ok(waits[i] > waits[i - 1] * 1.5, `retry waits should grow: ${waits.map(Math.round)}`);
  assert.ok(waits[0] >= 8_000, `first retry after ${waits[0]}ms`);
  assert.ok(shedShare(budget, frame, 600) > 0.9, "while it costs too much, it stays mostly off");
});
test("Once load passes, the shed pass returns", () => {
  const budget = createRenderBudget(1.25, 0.75);
  runUntil(budget, 40, (b) => b.saturated);
  const back = runUntil(budget, 16.67, (b) => !b.saturated, 60_000);
  assert.ok(back < 15_000, `back after ${back}ms of smooth frames`);
  assert.equal(budget.dpr, 0.75, "Resolution itself still never bounces back up");
});
