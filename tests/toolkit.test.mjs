import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path) {
  const context = { exports: {}, Math, Map, Set, Array };
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  );
  return context.exports;
}
const tk = load("lib/toolkit.ts");
const { projects } = load("data/projects.ts");
const toolkit = tk.buildToolkit(projects);

test("every technology in a project stack belongs to a toolkit family", () => {
  const families = new Set(tk.TOOLKIT_CATEGORIES.map((c) => c.id));
  for (const name of projects.flatMap((p) => p.stack)) {
    assert.ok(tk.TOOL_CATEGORY[name], `add "${name}" to TOOL_CATEGORY in lib/toolkit.ts`);
    assert.ok(families.has(tk.TOOL_CATEGORY[name]), name);
  }
});

test("the constellation mirrors the project stacks exactly", () => {
  const unique = new Set(projects.flatMap((p) => p.stack));
  const hubs = toolkit.nodes.filter((n) => n.kind === "project");
  const tools = toolkit.nodes.filter((n) => n.kind === "tool");
  assert.equal(hubs.length, projects.length);
  assert.equal(tools.length, unique.size);
  assert.equal(toolkit.edges.length, projects.reduce((s, p) => s + p.stack.length, 0));
  for (const tool of tools) {
    const users = projects.filter((p) => p.stack.includes(tool.label)).map((p) => p.title);
    assert.deepEqual([...tool.links.map((i) => toolkit.nodes[i].label)].sort(), [...users].sort(), tool.label);
  }
  hubs.forEach((hub, i) => {
    assert.equal(hub.slug, projects[i].slug);
    assert.deepEqual([...hub.links.map((t) => toolkit.nodes[t].label)], [...projects[i].stack]);
  });
});

test("the layout is deterministic, finite, in bounds and readable", () => {
  const again = tk.buildToolkit(projects);
  assert.equal(JSON.stringify(again.nodes), JSON.stringify(toolkit.nodes), "same shape on server and client");
  for (const n of toolkit.nodes) {
    for (const v of [n.x, n.y, n.z]) assert.ok(Number.isFinite(v), n.label);
    assert.ok(Math.abs(n.x) <= 3.7 + 1e-9 && Math.abs(n.y) <= 2.35 + 1e-9 && Math.abs(n.z) <= 0.8 + 1e-9, n.label);
  }
  let closest = Infinity;
  for (const a of toolkit.nodes)
    for (const b of toolkit.nodes)
      if (a.index < b.index) closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y));
  assert.ok(closest > 0.6, `labels need room: closest pair is ${closest.toFixed(2)} apart`);
});

test("a tool lights the projects that used it; a project lights its stack", () => {
  const next = toolkit.nodes.find((n) => n.label === "Next.js");
  const lit = tk.litBy(toolkit, next.index);
  assert.deepEqual([...lit.nodes].map((i) => toolkit.nodes[i].label).sort(), ["FirstDropAI", "MyGym", "Next.js"]);
  assert.equal(lit.edges.size, 2);
  const mygym = toolkit.nodes.find((n) => n.slug === "mygym");
  const stack = tk.litBy(toolkit, mygym.index);
  assert.equal(stack.nodes.size, 1 + projects[0].stack.length);
  assert.equal(stack.edges.size, projects[0].stack.length);
  assert.equal(tk.litBy(toolkit, -1).nodes.size, 0);
});

test("the index lists every tool once, grouped by family", () => {
  const listed = tk.toolkitIndex(toolkit).flatMap((f) => f.tools.map((t) => t.label));
  assert.equal(listed.length, new Set(listed).size);
  assert.equal(listed.length, toolkit.nodes.filter((n) => n.kind === "tool").length);
});
