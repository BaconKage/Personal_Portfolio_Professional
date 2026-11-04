import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const context = { exports: {}, Math, Array };
vm.runInNewContext(
  ts.transpileModule(readFileSync(new URL("../lib/liquid.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  context,
);
const liquid = context.exports;
const state = (over = {}) => ({ width: 1440, depth: 100, level: 0.5, stretch: 1, agitation: 0, time: 3, ...over });
const numbers = (path) => path.match(/-?\d+(\.\d+)?/g).map(Number);

test("drips are spread across the width, never bunched, and stable for a seed", () => {
  for (const width of [390, 768, 1440, 2560]) {
    const drips = liquid.createDrips(width, 7);
    assert.ok(drips.length >= 3 && drips.length <= 16, `${width}: ${drips.length}`);
    const xs = drips.map((d) => d.x);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] > 18, `${width}: drips ${i - 1}/${i} too close`);
    assert.ok(xs[0] > 0 && xs.at(-1) < width);
    assert.equal(JSON.stringify(liquid.createDrips(width, 7)), JSON.stringify(drips));
  }
});

test("the liquid never reaches past its depth, whatever the scroll does", () => {
  const drips = liquid.createDrips(1440, 3);
  for (const level of [0, 0.5, 1, 1.4]) {
    for (const stretch of [0.7, 1, 1.6]) {
      for (const agitation of [0, 1]) {
        const s = state({ level, stretch, agitation });
        const { path, bulbs } = liquid.liquidShape(s, drips);
        const ys = numbers(path).filter((_, i) => i % 2 === 1);
        assert.ok(ys.every((y) => Number.isFinite(y) && y >= 0 && y <= s.depth + 1e-6), `level ${level} stretch ${stretch}`);
        for (const b of bulbs) {
          assert.ok(Number.isFinite(b.cy) && b.r >= 0);
          if (b.r) assert.ok(b.cy + b.r <= s.depth + 1e-6, "a bulb never pokes past the depth");
        }
      }
    }
  }
});

test("pouring lengthens the drips; resting keeps them short", () => {
  const drips = liquid.createDrips(1440, 11);
  const rest = liquid.liquidShape(state({ level: 0.1 }), drips).lengths;
  const poured = liquid.liquidShape(state({ level: 1 }), drips).lengths;
  assert.ok(poured.every((l, i) => l > rest[i]));
  assert.ok(Math.max(...rest) < 15, `resting drips stay short: ${Math.max(...rest).toFixed(1)}`);
  assert.ok(Math.max(...poured) > 50, `poured drips are long: ${Math.max(...poured).toFixed(1)}`);
});

test("scroll inertia stretches drips and agitation roughens the surface", () => {
  const drips = liquid.createDrips(1440, 5);
  const calm = liquid.liquidShape(state({ stretch: 1 }), drips).lengths;
  const fast = liquid.liquidShape(state({ stretch: 1.5 }), drips).lengths;
  assert.ok(fast.every((l, i) => l > calm[i] * 1.4));
  const range = (agitation) => {
    const ys = Array.from({ length: 240 }, (_, i) => liquid.surface(i * 6, state({ agitation })));
    return Math.max(...ys) - Math.min(...ys);
  };
  assert.ok(range(1) > range(0) * 1.8);
});

test("the path starts and ends on the top edge and covers the whole width", () => {
  const s = state({ width: 390, depth: 50 });
  const { path } = liquid.liquidShape(s, liquid.createDrips(390, 2));
  assert.ok(path.startsWith("M0 0L0 "));
  assert.ok(path.endsWith(`L390 0Z`));
});
