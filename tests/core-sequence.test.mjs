import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function sequence() {
  let now = 0,
    id = 0;
  const timers = new Map();
  const context = {
    exports: {},
    performance: { now: () => now },
    setTimeout: (callback, delay) => {
      timers.set(++id, { callback, at: now + delay });
      return id;
    },
    clearTimeout: (key) => timers.delete(key),
  };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL("../lib/core-sequence.ts", import.meta.url), "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
    context,
  );
  return {
    ...context.exports,
    advance(ms) {
      const end = now + ms;
      while (true) {
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
      }
      now = end;
    },
  };
}

test("Charge cannot restart mid-flight, stars persist, and reform permits another full cycle", () => {
  const core = sequence();
  const phases = [];
  const unsubscribe = core.subscribeCore(() =>
    phases.push(core.getCoreState().phase),
  );
  core.activateCore();
  core.advance(800);
  core.activateCore();
  assert.equal(core.getCoreState().startedAt, 0);
  core.advance(4200);
  assert.equal(core.getCoreState().phase, "stars");
  core.advance(120000);
  assert.equal(core.getCoreState().phase, "stars");
  core.activateCore();
  core.advance(3200);
  assert.equal(core.getCoreState().phase, "idle");
  core.activateCore();
  assert.deepEqual(phases, [
    "charging",
    "dispersing",
    "stars",
    "reforming",
    "idle",
    "charging",
  ]);
  unsubscribe();
  core.resetCore();
});

test("Phase endpoints match, so the core never snaps at a timer handoff", () => {
  const core = sequence();
  const transitions = [
    ["idle", 0, "charging"],
    ["charging", 2200, "dispersing"],
    ["dispersing", 2800, "stars"],
    ["stars", 0, "reforming"],
    ["reforming", 3200, "idle"],
  ];
  for (const [from, duration, to] of transitions) {
    const before = core.sampleCore({ phase: from, startedAt: 0 }, duration);
    const after = core.sampleCore({ phase: to, startedAt: 0 }, 0);
    for (const key of Object.keys(before))
      assert.ok(
        Math.abs(before[key] - after[key]) < 1e-10,
        `${from} → ${to}: ${key}`,
      );
  }
});

test("Replay, reduced motion, or unmount can cancel any phase without delayed reactivation", () => {
  const core = sequence();
  for (const elapsed of [100, 3000, 6000]) {
    core.activateCore();
    core.advance(elapsed);
    core.resetCore();
    core.advance(10000);
    assert.equal(core.getCoreState().phase, "idle");
  }
});
