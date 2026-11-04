/**
 * The toolkit constellation: projects as hubs, the technologies in their
 * stacks as stars, wired to every project that used them. Built from
 * data/projects.ts, so adding a tool to a stack adds it here.
 *
 * Pure and deterministic (no randomness, no DOM), so the server-rendered
 * fallback, the WebGL world and the tests all see the same layout.
 */
export type ToolkitCategory = {
  id: string;
  name: string;
  /** Mark colour for this family in the constellation. */
  color: string;
};

export const TOOLKIT_CATEGORIES: ToolkitCategory[] = [
  { id: "interface", name: "Product & interface", color: "#7598ff" },
  { id: "backend", name: "Backend & data", color: "#efa87d" },
  { id: "ai", name: "AI & models", color: "#3fd2ff" },
  { id: "signal", name: "Signal, vision & speech", color: "#c9eea0" },
];

/** Every stack entry belongs to one family; tests fail on an unlisted tool. */
export const TOOL_CATEGORY: Record<string, string> = {
  "Next.js": "interface",
  "Expo / React Native": "interface",
  React: "interface",
  Vite: "interface",
  TypeScript: "interface",
  Figma: "interface",
  NestJS: "backend",
  PostgreSQL: "backend",
  Prisma: "backend",
  FastAPI: "backend",
  Flask: "backend",
  "MongoDB Atlas": "backend",
  Supabase: "backend",
  "Modal GPU": "backend",
  AASIST: "ai",
  "Silero VAD": "ai",
  "Gemini API": "ai",
  "OpenAI API": "ai",
  MediaPipe: "ai",
  "Prompt design": "ai",
  DSP: "signal",
  OpenCV: "signal",
  "Speech-to-text": "signal",
  "Text-to-speech": "signal",
};
const FALLBACK_CATEGORY = "backend";

/** The project colours used by the playground, so a project reads the same in both. */
export const PROJECT_COLORS = [
  "#7598ff",
  "#aecbff",
  "#efa87d",
  "#b4a1ff",
  "#c9eea0",
];

export type ToolkitNode = {
  index: number;
  kind: "project" | "tool";
  label: string;
  /** Project slug, for hubs. */
  slug?: string;
  /** Category id, for tools. */
  category?: string;
  color: string;
  /** Indices of the nodes this one is wired to. */
  links: number[];
  x: number;
  y: number;
  z: number;
};
export type Toolkit = {
  nodes: ToolkitNode[];
  /** [tool index, project index] pairs. */
  edges: [number, number][];
  /** Half-extents of the layout, for fitting it to a stage. */
  extent: { x: number; y: number; z: number };
};

/** A stable pseudo-random number in [0, 1) from a string. */
function hash(text: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

const BOUNDS = { x: 3.7, y: 2.35, z: 0.8 };

export function buildToolkit(
  projects: { slug: string; title: string; stack: string[] }[],
): Toolkit {
  const nodes: ToolkitNode[] = [];
  const edges: [number, number][] = [];
  const count = projects.length;
  // Hubs on a wide ellipse, alternating a little in depth.
  projects.forEach((p, i) => {
    const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
    nodes.push({
      index: i,
      kind: "project",
      label: p.title,
      slug: p.slug,
      color: PROJECT_COLORS[i % PROJECT_COLORS.length],
      links: [],
      x: Math.cos(angle) * 2.35,
      y: Math.sin(angle) * 1.45,
      z: (i % 2 ? -1 : 1) * 0.35,
    });
  });
  const byName = new Map<string, ToolkitNode>();
  projects.forEach((p, hub) => {
    for (const name of p.stack) {
      let tool = byName.get(name);
      if (!tool) {
        const category = TOOL_CATEGORY[name] ?? FALLBACK_CATEGORY;
        tool = {
          index: nodes.length,
          kind: "tool",
          label: name,
          category,
          color:
            TOOLKIT_CATEGORIES.find((c) => c.id === category)?.color ??
            TOOLKIT_CATEGORIES[1].color,
          links: [],
          x: 0,
          y: 0,
          z: 0,
        };
        byName.set(name, tool);
        nodes.push(tool);
      }
      tool.links.push(hub);
      nodes[hub].links.push(tool.index);
      edges.push([tool.index, hub]);
    }
  });

  // Seed each tool beside its hubs: shared tools near the middle of the
  // projects they bridge, single-project tools fanned outward from theirs.
  const tools = nodes.filter((n) => n.kind === "tool");
  for (const tool of tools) {
    const hubs = tool.links.map((i) => nodes[i]);
    const cx = hubs.reduce((s, h) => s + h.x, 0) / hubs.length;
    const cy = hubs.reduce((s, h) => s + h.y, 0) / hubs.length;
    const spread = hubs.length > 1 ? 0.35 : 1.05;
    const angle = hash(tool.label) * Math.PI * 2;
    const pull = hubs.length > 1 ? 0.55 : 1;
    tool.x = cx * pull + Math.cos(angle) * spread;
    tool.y = cy * pull + Math.sin(angle) * spread * 0.8;
    tool.z = (hash(tool.label, 7) - 0.5) * 1.2;
  }

  // Relax: tools repel each other and every hub, and spring toward the hubs
  // they are wired to. Hubs stay put. Labels are flat, so repulsion is
  // measured mostly across the screen plane; depth only adds parallax.
  // A fixed number of steps keeps it deterministic.
  const REST = 1.2;
  const STEPS = 420;
  for (let step = 0; step < STEPS; step++) {
    const cooling = 1 - step / STEPS;
    for (const a of tools) {
      let fx = 0,
        fy = 0,
        fz = 0;
      for (const b of nodes) {
        if (a === b) continue;
        const dx = a.x - b.x,
          dy = a.y - b.y,
          dz = a.z - b.z;
        const d2 = Math.max(0.02, dx * dx + dy * dy * 1.6 + dz * dz * 0.15);
        const push = (b.kind === "project" ? 0.2 : 0.11) / d2;
        const d = Math.sqrt(d2);
        // Coincident points split along a stable direction instead of NaN.
        const ux = d > 1e-6 ? dx / d : Math.cos(a.index),
          uy = d > 1e-6 ? dy / d : Math.sin(a.index);
        fx += ux * push;
        fy += uy * push;
        fz += (dz / Math.max(d, 1e-6)) * push * 0.2;
      }
      for (const hubIndex of a.links) {
        const h = nodes[hubIndex];
        const dx = h.x - a.x,
          dy = h.y - a.y,
          dz = h.z - a.z;
        const d = Math.max(0.001, Math.sqrt(dx * dx + dy * dy + dz * dz));
        const pull = (d - REST) * 0.12;
        fx += (dx / d) * pull;
        fy += (dy / d) * pull;
        fz += (dz / d) * pull;
      }
      // A gentle pull to the middle keeps the cloud round instead of
      // pressing it against walls; depth is held shallow.
      fx -= a.x * 0.012;
      fy -= a.y * 0.02;
      fz -= a.z * 0.05;
      const limit = 0.12 * cooling + 0.01;
      a.x += Math.max(-limit, Math.min(limit, fx));
      a.y += Math.max(-limit, Math.min(limit, fy));
      a.z += Math.max(-limit, Math.min(limit, fz));
    }
  }
  // Fit the settled shape to the stage proportions, keeping its form.
  const spanX = Math.max(...nodes.map((n) => Math.abs(n.x)));
  const spanY = Math.max(...nodes.map((n) => Math.abs(n.y)));
  const spanZ = Math.max(1e-6, ...nodes.map((n) => Math.abs(n.z)));
  const fit = Math.min(BOUNDS.x / spanX, BOUNDS.y / spanY);
  // Depth only adds parallax, so it is normalised on its own.
  const depth = BOUNDS.z / spanZ;
  for (const n of nodes) {
    n.x *= fit;
    n.y *= fit;
    n.z *= depth;
  }
  const extent = {
    x: Math.max(...nodes.map((n) => Math.abs(n.x))),
    y: Math.max(...nodes.map((n) => Math.abs(n.y))),
    z: Math.max(...nodes.map((n) => Math.abs(n.z))),
  };
  return { nodes, edges, extent };
}

/** The family list shown beside the constellation, tools in stack order. */
export function toolkitIndex(toolkit: Toolkit) {
  return TOOLKIT_CATEGORIES.map((category) => ({
    ...category,
    tools: toolkit.nodes
      .filter((n) => n.kind === "tool" && n.category === category.id)
      .map((tool) => ({
        index: tool.index,
        label: tool.label,
        projects: tool.links.map((i) => toolkit.nodes[i].label),
      })),
  })).filter((c) => c.tools.length);
}

/**
 * What lights up when a node is active: a tool lights the projects that used
 * it; a project lights its whole stack. Returns node and edge index sets.
 */
export function litBy(toolkit: Toolkit, active: number) {
  const nodes = new Set<number>(),
    edges = new Set<number>();
  if (active < 0 || active >= toolkit.nodes.length) return { nodes, edges };
  nodes.add(active);
  toolkit.nodes[active].links.forEach((i) => nodes.add(i));
  toolkit.edges.forEach(([tool, hub], i) => {
    if (tool === active || hub === active) edges.add(i);
  });
  return { nodes, edges };
}
