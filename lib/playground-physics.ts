/** Five planar collision bodies drive the 3D sculptures. Units are scene units.
 * A bounded fixed timestep keeps fast throws stable across rendering speeds. */
export type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  radius: number;
  angle: number;
  spin: number;
};
export type PlaygroundPhysics = {
  bodies: Body[];
  width: number;
  height: number;
  assembling: boolean;
  drag: {
    index: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null;
  accumulator: number;
};
const formation = [
  [-0.56, 0.5],
  [0.5, 0.56],
  [0, 0],
  [-0.53, -0.5],
  [0.54, -0.49],
];
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const STEP = 1 / 120;

export function createPlaygroundPhysics(
  width = 10,
  height = 8,
): PlaygroundPhysics {
  const state: PlaygroundPhysics = {
    bodies: formation.map(() => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      homeX: 0,
      homeY: 0,
      radius: 0.8,
      angle: 0,
      spin: 0,
    })),
    width,
    height,
    assembling: true,
    drag: null,
    accumulator: 0,
  };
  resizePlayground(state, width, height);
  state.bodies.forEach((b) => {
    b.x = b.homeX;
    b.y = b.homeY;
  });
  return state;
}

export function resizePlayground(
  state: PlaygroundPhysics,
  width: number,
  height: number,
) {
  state.width = Math.max(3, width);
  state.height = Math.max(3, height);
  const radius = Math.min(0.92, state.width / 6.6, state.height / 6.6);
  state.drag = null;
  state.assembling = true;
  state.bodies.forEach((b, i) => {
    b.radius = radius;
    b.homeX = formation[i][0] * (state.width / 2 - radius * 0.5);
    b.homeY = formation[i][1] * (state.height / 2 - radius * 0.5);
    b.vx = b.vy = b.spin = 0;
    contain(b, state);
  });
}

function contain(b: Body, state: PlaygroundPhysics) {
  const x = state.width / 2 - b.radius,
    y = state.height / 2 - b.radius;
  if (Math.abs(b.x) > x) {
    b.x = clamp(b.x, -x, x);
    b.vx *= -0.66;
    b.spin += b.vy * 0.06;
  }
  if (Math.abs(b.y) > y) {
    b.y = clamp(b.y, -y, y);
    b.vy *= -0.66;
    b.spin -= b.vx * 0.06;
  }
}

export function grabBody(
  state: PlaygroundPhysics,
  index: number,
  x: number,
  y: number,
) {
  const b = state.bodies[index];
  if (!b) return;
  state.assembling = false;
  state.drag = { index, x: b.x, y: b.y, offsetX: b.x - x, offsetY: b.y - y };
  b.vx = b.vy = b.spin = 0;
}

export function moveBody(state: PlaygroundPhysics, x: number, y: number) {
  if (!state.drag) return;
  const { radius } = state.bodies[state.drag.index];
  state.drag.x = clamp(
    x + state.drag.offsetX,
    -state.width / 2 + radius,
    state.width / 2 - radius,
  );
  state.drag.y = clamp(
    y + state.drag.offsetY,
    -state.height / 2 + radius,
    state.height / 2 - radius,
  );
}

export function releaseBody(state: PlaygroundPhysics, vx = 0, vy = 0) {
  if (!state.drag) return;
  const b = state.bodies[state.drag.index];
  const speed = Math.hypot(vx, vy);
  const cap = speed > 14 ? 14 / speed : 1;
  b.vx = Number.isFinite(vx) ? vx * cap : 0;
  b.vy = Number.isFinite(vy) ? vy * cap : 0;
  b.spin = clamp((b.vx - b.vy) * 0.22, -3, 3);
  state.drag = null;
}

export function assembleBodies(state: PlaygroundPhysics) {
  releaseBody(state);
  state.assembling = true;
}

export function nudgeBody(
  state: PlaygroundPhysics,
  index: number,
  x: number,
  y: number,
) {
  const b = state.bodies[index];
  if (!b) return;
  state.assembling = false;
  b.vx = clamp(b.vx + x * 4, -10, 10);
  b.vy = clamp(b.vy + y * 4, -10, 10);
  b.spin += (x - y) * 0.35;
}

export function advancePlayground(state: PlaygroundPhysics, delta: number) {
  if (!Number.isFinite(delta) || delta <= 0) return;
  // Discard long pauses; never replay a hidden tab's elapsed time.
  state.accumulator += Math.min(delta, 0.05);
  while (state.accumulator >= STEP) {
    state.accumulator -= STEP;
    for (let i = 0; i < state.bodies.length; i++) {
      const b = state.bodies[i];
      if (state.drag?.index === i) {
        b.vx = (state.drag.x - b.x) * 25;
        b.vy = (state.drag.y - b.y) * 25;
      } else if (state.assembling) {
        b.vx += ((b.homeX - b.x) * 20 - b.vx * 8) * STEP;
        b.vy += ((b.homeY - b.y) * 20 - b.vy * 8) * STEP;
        b.spin += (-b.angle * 12 - b.spin * 6) * STEP;
      } else {
        const damping = Math.exp(-0.8 * STEP);
        b.vx *= damping;
        b.vy *= damping;
        b.spin *= Math.exp(-1.3 * STEP);
      }
      b.x += b.vx * STEP;
      b.y += b.vy * STEP;
      b.angle += b.spin * STEP;
      contain(b, state);
    }
    // Sphere proxies intentionally leave room for the sculptures' rotation.
    for (let i = 0; i < state.bodies.length; i++)
      for (let j = i + 1; j < state.bodies.length; j++) {
        const a = state.bodies[i],
          b = state.bodies[j];
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const distance = Math.hypot(dx, dy),
          minimum = a.radius + b.radius;
        if (distance >= minimum) continue;
        const nx = distance > 0.0001 ? dx / distance : 1;
        const ny = distance > 0.0001 ? dy / distance : 0;
        const massA = state.drag?.index === i ? 0 : 1;
        const massB = state.drag?.index === j ? 0 : 1;
        const total = massA + massB;
        const correction = (minimum - distance + 0.001) / total;
        a.x -= nx * correction * massA;
        a.y -= ny * correction * massA;
        b.x += nx * correction * massB;
        b.y += ny * correction * massB;
        const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (closing < 0) {
          const impulse = Math.min(18, (-(1 + 0.7) * closing) / total);
          a.vx -= impulse * nx * massA;
          a.vy -= impulse * ny * massA;
          b.vx += impulse * nx * massB;
          b.vy += impulse * ny * massB;
          a.spin = clamp(a.spin - impulse * ny * 0.15, -4, 4);
          b.spin = clamp(b.spin + impulse * nx * 0.15, -4, 4);
        }
        contain(a, state);
        contain(b, state);
      }
  }
}
