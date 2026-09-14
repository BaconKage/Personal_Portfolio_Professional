import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const context = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(
      new URL("../lib/playground-physics.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText,
  context,
);
const {
  createPlaygroundPhysics,
  advancePlayground,
  grabBody,
  moveBody,
  releaseBody,
  assembleBodies,
  resizePlayground,
} = context.exports;
const run = (state, seconds, fps = 60) => {
  for (let i = 0; i < seconds * fps; i++) advancePlayground(state, 1 / fps);
};

test("A thrown sculpture transfers momentum on contact and stays inside the stage", () => {
  const state = createPlaygroundPhysics(10, 8);
  state.assembling = false;
  const [a, b] = state.bodies;
  a.x = -2;
  a.y = 0;
  a.vx = 8;
  b.x = 0;
  b.y = 0;
  state.bodies.slice(2).forEach((body, i) => {
    body.x = (i - 1) * 3;
    body.y = 3;
  });
  run(state, 0.3);
  assert.ok(b.vx > 1, "The second object should receive the collision impulse");
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius - 0.02);
  run(state, 20);
  for (const body of state.bodies) {
    assert.ok(Math.abs(body.x) + body.radius <= 5.001);
    assert.ok(Math.abs(body.y) + body.radius <= 4.001);
    assert.ok(Number.isFinite(body.angle));
  }
});

test("Drag cancellation stops a held object, while a release caps throw speed", () => {
  const state = createPlaygroundPhysics();
  const b = state.bodies[0];
  grabBody(state, 0, b.x, b.y);
  moveBody(state, 999, -999);
  run(state, 0.25);
  assert.ok(Math.abs(b.x) + b.radius <= state.width / 2 + 0.001);
  releaseBody(state, 1000, 1000);
  assert.ok(Math.hypot(b.vx, b.vy) <= 14.001);
  assert.equal(state.drag, null);
  grabBody(state, 0, b.x, b.y);
  releaseBody(state);
  assert.equal(b.vx, 0);
  assert.equal(b.vy, 0);
});

test("Assemble returns every scattered body to its formation at desktop and mobile sizes", () => {
  for (const [width, height] of [
    [10, 6.4],
    [4.5, 6.4],
    [3, 3],
  ]) {
    const state = createPlaygroundPhysics(width, height);
    state.assembling = false;
    state.bodies.forEach((b, i) => {
      b.vx = (i - 2) * 4;
      b.vy = 6 - i * 2;
      b.spin = 2;
    });
    run(state, 1);
    assembleBodies(state);
    run(state, 6);
    for (const b of state.bodies) {
      assert.ok(
        Math.hypot(b.x - b.homeX, b.y - b.homeY) < 0.03,
        `${width}×${height}: formation should settle`,
      );
      assert.ok(Math.abs(b.angle) < 0.03);
    }
  }
});

test("Fixed timesteps produce the same throw at 30, 60, and 120 FPS", () => {
  const samples = [30, 60, 120].map((fps) => {
    const state = createPlaygroundPhysics();
    state.assembling = false;
    state.bodies[0].vx = 11;
    state.bodies[0].vy = -4;
    run(state, 2, fps);
    return state.bodies.map((b) => [b.x, b.y]);
  });
  for (const sample of samples.slice(1))
    sample.forEach((p, i) => {
      assert.ok(
        Math.hypot(p[0] - samples[0][i][0], p[1] - samples[0][i][1]) < 0.001,
      );
    });
});

test("A resize releases an active drag; long pauses and coincident objects stay finite", () => {
  const state = createPlaygroundPhysics();
  grabBody(state, 0, 0, 0);
  resizePlayground(state, 4.5, 6.4);
  assert.equal(state.drag, null);
  assert.equal(state.assembling, true);
  state.bodies.forEach((b) => {
    b.x = 0;
    b.y = 0;
  });
  advancePlayground(state, 3600);
  run(state, 6);
  for (const b of state.bodies)
    for (const value of Object.values(b)) assert.ok(Number.isFinite(value));
});
