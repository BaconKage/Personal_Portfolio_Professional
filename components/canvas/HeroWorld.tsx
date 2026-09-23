/* eslint-disable react-hooks/immutability, react-hooks/refs, react-hooks/purity -- Materials, transforms and the intro build are mutable GPU state owned by the render loop. */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { SceneProps } from "./types";
import { CORE_IGNITION_MS } from "@/lib/motion";
import { CORE_TIMING, getCoreState, sampleCore } from "@/lib/core-sequence";

/**
 * An arc-reactor core with real depth: a thick housing ringed by ten
 * copper-wound coils alternating with glowing acrylic blocks, held by clamp
 * bars and ball bolts; a slotted gunmetal ring; and a stepped light tunnel
 * down to a meshed core. Energising lights the blocks in sequence, draws
 * sparks inward, and fires into a sustained glow that floods the hero.
 */

const SEGMENTS = 20; // alternating coil / glass around the ring
const COILS = SEGMENTS / 2;
const SLOTS = 30;
const TUNNEL = 5;
const RING_RADIUS = 1.98;
const CYAN = new THREE.Color("#3fd2ff");
const ICE = new THREE.Color("#d2f8ff");
const BLUE = new THREE.Color("#2f7dff");

// Light that adds to the page without darkening it: premultiplied "plus".
const lightBlend = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
} as const;
const lightOut = `gl_FragColor = vec4(c, clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0));`;
const planeVertex = /* glsl */ `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function glowMaterial(color: THREE.Color, sigma: number) {
  return new THREE.ShaderMaterial({
    ...lightBlend,
    depthTest: false,
    uniforms: {
      uColor: { value: color.clone() },
      uIntensity: { value: 0 },
      uSigma: { value: sigma },
    },
    vertexShader: planeVertex,
    fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uIntensity; uniform float uSigma;
    varying vec2 vUv;
    void main() {
      float r = length(vUv - 0.5) * 2.0;
      float g = exp(-r * r * uSigma) * (1.0 - smoothstep(0.82, 1.0, r));
      vec3 c = uColor * g * uIntensity;
      ${lightOut}
    }`,
  });
}

/** Copper windings: fine bright/dark wire bands, used as colour and bump. */
function coilTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 16;
  const ctx = canvas.getContext("2d")!;
  for (let x = 0; x < 128; x += 5) {
    const g = ctx.createLinearGradient(x, 0, x + 5, 0);
    g.addColorStop(0, "#3d1d0e");
    g.addColorStop(0.35, "#c97b4a");
    g.addColorStop(0.55, "#f2b385");
    g.addColorStop(1, "#3d1d0e");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 5, 16);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/**
 * The "SV" monogram at the heart of the core, set in the site's own face
 * (the wordmark's font) with a soft halo baked in. Redrawn once web fonts load.
 */
function drawMonogram(canvas: HTMLCanvasElement) {
  const size = canvas.width;
  const ctx = canvas.getContext("2d")!;
  const family =
    getComputedStyle(document.querySelector(".wordmark") ?? document.body)
      .fontFamily || "sans-serif";
  ctx.clearRect(0, 0, size, size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `650 ${size * 0.5}px ${family}`;
  if ("letterSpacing" in ctx)
    (
      ctx as CanvasRenderingContext2D & { letterSpacing: string }
    ).letterSpacing = `${-size * 0.03}px`;
  const y = size * 0.53;
  // Channels, not colours: green marks a dark keyline around the letters,
  // red their lit face (painted over it), alpha the coverage. The keyline
  // keeps "SV" legible against a white-hot core.
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.045;
  ctx.strokeStyle = "#00ff00";
  ctx.strokeText("SV", size / 2, y);
  ctx.fillStyle = "#ff0000";
  ctx.fillText("SV", size / 2, y);
}
function monogramTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  drawMonogram(canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/** The gunmetal ring, pierced by pill-shaped slots that let light through. */
function slottedRing(detail: number) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1.52, 0, Math.PI * 2, false);
  const bore = new THREE.Path();
  bore.absarc(0, 0, 1.08, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  const w = 0.046,
    r1 = 1.22,
    r2 = 1.38;
  for (let i = 0; i < SLOTS; i++) {
    const a = (i / SLOTS) * Math.PI * 2 + Math.PI / SLOTS;
    const dx = Math.cos(a),
      dy = Math.sin(a),
      tx = -dy,
      ty = dx;
    const at = (u: number, v: number) =>
      new THREE.Vector2(dx * u + tx * v, dy * u + ty * v);
    const pts: THREE.Vector2[] = [];
    for (let k = 0; k <= 8; k++) {
      const t = -Math.PI / 2 + (k / 8) * Math.PI;
      pts.push(at(r2 + Math.cos(t) * w, Math.sin(t) * w));
    }
    for (let k = 0; k <= 8; k++) {
      const t = Math.PI / 2 + (k / 8) * Math.PI;
      pts.push(at(r1 + Math.cos(t) * w, Math.sin(t) * w));
    }
    shape.holes.push(new THREE.Path(pts));
  }
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: detail,
  });
}

/** A HUD ring: a fine circle with tick marks, optionally broken into arcs. */
function hudRing(radius: number, ticks: number, dashed: boolean) {
  const points: number[] = [];
  const segments = 180;
  for (let i = 0; i < segments; i++) {
    if (dashed && i % 30 > 20) continue;
    const a = (i / segments) * Math.PI * 2,
      b = ((i + 1) / segments) * Math.PI * 2;
    points.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    points.push(Math.cos(b) * radius, Math.sin(b) * radius, 0);
  }
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const long = i % 5 === 0 ? 0.16 : 0.07;
    points.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    points.push(
      Math.cos(a) * (radius - long),
      Math.sin(a) * (radius - long),
      0,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );
  return geometry;
}

/** Place something on the segment ring: local x tangential, y radial. */
function onRing(
  angle: number,
  radius: number,
  local: [number, number, number],
) {
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, 0, angle - Math.PI / 2),
  );
  const offset = new THREE.Vector3(...local).applyQuaternion(q);
  return new THREE.Matrix4().compose(
    new THREE.Vector3(
      Math.cos(angle) * radius + offset.x,
      Math.sin(angle) * radius + offset.y,
      local[2],
    ),
    q,
    new THREE.Vector3(1, 1, 1),
  );
}
const segmentAngle = (k: number) => (k / SEGMENTS) * Math.PI * 2 + Math.PI / 2;
/** Progress of one step of the build: 0 before `start`, 1 after `start + span`. */
const step = (x: number, start: number, span: number) =>
  THREE.MathUtils.clamp((x - start) / span, 0, 1);
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeBack = (p: number) =>
  1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);

export default function HeroWorld({
  pointer,
  quality,
  layout,
  active,
}: SceneProps) {
  const renderer = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const drag = useRef({ x: 0, y: 0 });
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const hudA = useRef<THREE.LineSegments>(null);
  const hudB = useRef<THREE.LineSegments>(null);
  const glassLights = useRef<THREE.InstancedMesh>(null);
  const instances = useRef<Record<string, THREE.InstancedMesh | null>>({});
  const body = useRef<THREE.Group>(null);
  const wires = useRef<THREE.Group>(null);
  const slotted = useRef<THREE.Group>(null);
  const tunnelRings = useRef<(THREE.Mesh | null)[]>([]);
  const bezel = useRef<THREE.Mesh>(null);
  const built = useRef(false);
  const light = useRef<THREE.PointLight>(null);
  const wave = useRef<THREE.Mesh>(null);
  const wash = useRef<THREE.Mesh>(null);
  const element = useRef<HTMLElement | null>(null);
  const motion = useRef({ time: 0, inflow: 0, orbit: 0, spinA: 0, spinB: 0 });

  // Reflections are what make metal and acrylic read as real.
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    scene.environment = env;
    scene.environmentIntensity = 0.5;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [renderer, scene]);

  const parts = useMemo(() => {
    const detail = quality < 0.75 ? 64 : 112;
    const texture = coilTexture();
    const tunnel = Array.from(
      { length: TUNNEL },
      () => new THREE.MeshBasicMaterial({ color: "#ffffff", ...lightBlend }),
    );
    return {
      // An open drum: outer shell, front face ring, and a tapered tunnel wall
      // down to a back plate, so the centre is genuinely hollow.
      housing: new THREE.CylinderGeometry(
        2.28,
        2.3,
        0.72,
        detail,
        1,
        true,
      ).rotateX(Math.PI / 2),
      face: new THREE.RingGeometry(1.08, 2.29, detail, 1),
      tunnelWall: new THREE.CylinderGeometry(
        1.08,
        0.7,
        0.62,
        detail,
        4,
        true,
      ).rotateX(Math.PI / 2),
      backPlate: new THREE.CircleGeometry(0.72, detail),
      coil: new RoundedBoxGeometry(0.5, 0.8, 0.6, 3, 0.05),
      clamp: new THREE.BoxGeometry(0.06, 0.88, 0.64),
      bolt: new THREE.SphereGeometry(0.068, 16, 12),
      glassShell: new RoundedBoxGeometry(0.52, 0.74, 0.46, 3, 0.07),
      glassCore: new RoundedBoxGeometry(0.42, 0.62, 0.38, 2, 0.05),
      wire: new THREE.TorusGeometry(1, 0.02, 8, detail * 2),
      slotted: slottedRing(detail),
      slotLight: new THREE.RingGeometry(1.08, 1.52, detail, 1),
      ridge: new THREE.BoxGeometry(0.34, 0.045, 0.1),
      bracket: new THREE.BoxGeometry(0.4, 0.36, 0.05),
      screw: new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12).rotateX(
        Math.PI / 2,
      ),
      tunnelRing: new THREE.TorusGeometry(1, 0.028, 10, detail),
      bezel: new THREE.TorusGeometry(0.66, 0.055, 16, detail),
      core: new THREE.CircleGeometry(0.66, 64),
      monogram: monogramTexture(),
      backLight: new THREE.CircleGeometry(1.08, detail),
      hudA: hudRing(2.92, 72, false),
      hudB: hudRing(3.22, 36, true),
      wave: new THREE.TorusGeometry(1, 0.018, 8, 160),
      plane: new THREE.PlaneGeometry(1, 1),
      texture,
      gunmetal: new THREE.MeshStandardMaterial({
        color: "#3a4150",
        metalness: 0.85,
        roughness: 0.36,
      }),
      darkMetal: new THREE.MeshStandardMaterial({
        color: "#1b212c",
        metalness: 0.75,
        roughness: 0.45,
      }),
      tunnelMetal: new THREE.MeshStandardMaterial({
        color: "#252c39",
        metalness: 0.8,
        roughness: 0.4,
        side: THREE.BackSide,
      }),
      blackGloss: new THREE.MeshStandardMaterial({
        color: "#0c0f15",
        metalness: 0.55,
        roughness: 0.2,
      }),
      copper: new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: texture,
        bumpScale: 2.5,
        // Warm the windings so they stay copper under cyan light.
        color: "#f0a16c",
        metalness: 0.62,
        roughness: 0.36,
        envMapIntensity: 0.55,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: "#bff4ff",
        metalness: 0,
        roughness: 0.06,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
      glassGlow: new THREE.MeshBasicMaterial({
        color: "#ffffff",
        toneMapped: false,
      }),
      slotGlow: new THREE.MeshBasicMaterial({ color: CYAN, toneMapped: false }),
      backGlow: new THREE.MeshBasicMaterial({ color: CYAN, ...lightBlend }),
      tunnel,
      hud: new THREE.LineBasicMaterial({ color: CYAN, ...lightBlend }),
      waveMaterial: new THREE.MeshBasicMaterial({ color: ICE, ...lightBlend }),
      coreMaterial: new THREE.ShaderMaterial({
        ...lightBlend,
        uniforms: {
          uTime: { value: 0 },
          uPower: { value: 0 },
          uFlash: { value: 0 },
        },
        vertexShader: planeVertex,
        // A meshed emitter: fine grid over a hot centre, rippling with power.
        fragmentShader: /* glsl */ `uniform float uTime; uniform float uPower; uniform float uFlash;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - 0.5;
          float r = length(p) * 2.0;
          vec2 cell = abs(fract(p * 26.0 + vec2(0.0, 0.5 * step(0.5, fract(p.x * 13.0)))) - 0.5);
          float mesh = smoothstep(0.34, 0.5, max(cell.x, cell.y));
          float ripple = 0.5 + 0.5 * sin(r * 22.0 - uTime * (1.2 + uPower * 6.0));
          float heart = exp(-r * r * 3.2);
          vec3 cyan = vec3(0.25, 0.82, 1.0);
          vec3 c = mix(cyan, vec3(0.95, 1.0, 1.0), heart * 0.8) *
            (0.55 + heart * 1.2 + ripple * 0.25 * uPower) * (1.0 - mesh * 0.45) *
            (0.12 + uPower * 1.0);
          c += vec3(0.85, 0.97, 1.0) * uFlash * heart * 2.2;
          c *= smoothstep(1.0, 0.92, r);
          ${lightOut}
        }`,
      }),
      monogramMaterial: new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: { uMap: { value: null }, uIntensity: { value: 0 } },
        vertexShader: planeVertex,
        // Lit letter faces (cyan at rest, white-hot online) inside a dark keyline.
        fragmentShader: /* glsl */ `uniform sampler2D uMap; uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          vec4 t = texture2D(uMap, vUv);
          float face = t.r / max(t.r + t.g, 1e-4);
          vec3 lit = mix(vec3(0.3, 0.85, 1.0), vec3(1.0), clamp(uIntensity - 0.6, 0.0, 1.0));
          vec3 c = mix(vec3(0.01, 0.05, 0.09), lit * min(uIntensity * 1.4, 1.0), face);
          gl_FragColor = vec4(c, t.a);
        }`,
      }),
      coreGlow: glowMaterial(CYAN, 2.6),
      heroWash: glowMaterial(BLUE, 3.4),
      rays: new THREE.ShaderMaterial({
        ...lightBlend,
        depthTest: false,
        uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
        vertexShader: planeVertex,
        fragmentShader: /* glsl */ `uniform float uTime; uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - 0.5;
          float r = length(p) * 2.0;
          float a = atan(p.y, p.x);
          float rays = pow(0.5 + 0.5 * sin(a * 14.0 + sin(a * 5.0 + uTime * 0.6) * 2.0), 6.0) * 0.6 +
            pow(0.5 + 0.5 * sin(a * 23.0 - uTime * 0.45), 10.0) * 0.4;
          float fall = exp(-r * 2.4) * smoothstep(0.1, 0.28, r) * (1.0 - smoothstep(0.8, 1.0, r));
          vec3 c = vec3(0.3, 0.72, 1.0) * rays * fall * uIntensity;
          ${lightOut}
        }`,
      }),
    };
  }, [quality]);

  const sparks = useMemo(() => {
    const count = quality < 0.75 ? 160 : 320;
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const h = (n: number) => {
        const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };
      seeds.set([h(1) * Math.PI * 2, 0.4 + h(2), h(3), h(4)], i * 4);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    const material = new THREE.ShaderMaterial({
      ...lightBlend,
      uniforms: {
        uTime: { value: 0 },
        uInflow: { value: 0 },
        uOrbit: { value: 0 },
        uDpr: { value: 1 },
      },
      vertexShader: /* glsl */ `uniform float uTime; uniform float uInflow; uniform float uOrbit; uniform float uDpr;
      attribute vec4 aSeed;
      varying float vAlpha;
      void main() {
        // Charging: sparks accelerate inward along a spiral into the core.
        float f = fract(aSeed.w + uTime * aSeed.y * 0.38);
        float rIn = mix(4.4 + aSeed.z, 0.6, f * f);
        float aIn = aSeed.x + f * 2.8;
        vec3 inflow = vec3(cos(aIn) * rIn, sin(aIn) * rIn, 0.5 + (1.0 - f) * aSeed.z * 0.9);
        // Online: a bright current circling the coil ring.
        float aOr = aSeed.x + uTime * (0.7 + aSeed.y * 0.9);
        float rOr = 1.98 + (aSeed.z - 0.5) * 0.7 + sin(uTime * 2.0 + aSeed.w * 6.28) * 0.04;
        vec3 orbit = vec3(cos(aOr) * rOr, sin(aOr) * rOr, 0.42 + (aSeed.w - 0.5) * 0.12);
        vec3 pos = mix(inflow, orbit, uOrbit);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        float flick = 0.6 + 0.4 * sin(uTime * 23.0 + aSeed.w * 50.0);
        vAlpha = (uInflow * sin(f * 3.14159) + uOrbit * 0.45) * flick;
        gl_PointSize = (2.0 + aSeed.y * 2.2) * uDpr * (7.0 / -mv.z);
      }`,
      fragmentShader: /* glsl */ `varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        vec3 c = vec3(0.6, 0.92, 1.0) * smoothstep(0.5, 0.0, d) * vAlpha * 1.6;
        ${lightOut}
      }`,
    });
    return { geometry, material };
  }, [quality]);

  // Instance transforms, computed once.
  const layoutRing = useMemo(() => {
    const coils: THREE.Matrix4[] = [],
      glass: THREE.Matrix4[] = [],
      clamps: THREE.Matrix4[] = [],
      bolts: THREE.Matrix4[] = [],
      ridges: THREE.Matrix4[] = [],
      brackets: THREE.Matrix4[] = [],
      screws: THREE.Matrix4[] = [];
    for (let k = 0; k < SEGMENTS; k++) {
      const a = segmentAngle(k);
      if (k % 2 === 0) {
        coils.push(onRing(a, RING_RADIUS, [0, 0, 0.02]));
        for (const side of [-1, 1]) {
          clamps.push(onRing(a, RING_RADIUS, [side * 0.285, 0, 0.02]));
          for (const end of [-1, 1])
            bolts.push(onRing(a, RING_RADIUS, [side * 0.285, end * 0.4, 0.35]));
        }
      } else glass.push(onRing(a, RING_RADIUS, [0, 0, -0.04]));
    }
    // Three clamp brackets bridge the slotted ring into the light tunnel.
    for (const deg of [90, 210, 330]) {
      const a = THREE.MathUtils.degToRad(deg);
      brackets.push(onRing(a, 1.1, [0, 0, 0.3]));
      for (const u of [-0.1, -0.02, 0.06])
        ridges.push(onRing(a, 1.1, [0, u, 0.36]));
      for (const side of [-1, 1])
        screws.push(
          onRing(a + side * THREE.MathUtils.degToRad(11), 1.3, [0, 0, 0.33]),
        );
    }
    return { coils, glass, clamps, bolts, ridges, brackets, screws };
  }, []);
  const place =
    (name: string, list: THREE.Matrix4[]) =>
    (mesh: THREE.InstancedMesh | null) => {
      instances.current[name] = mesh;
      if (!mesh) return;
      list.forEach((m4, i) => mesh.setMatrixAt(i, m4));
      mesh.instanceMatrix.needsUpdate = true;
    };

  /**
   * The intro builds the reactor: the drum rises, coils fly in and turn into
   * place, acrylic slides in from the front, bolts pop in, the slotted ring
   * twists down into its seat, the tunnel stacks in, and the bezel seats last.
   * `x` is the intro's progress (0..1); at 1 everything is in its final place.
   */
  const scratch = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      t: new THREE.Matrix4(),
      s: new THREE.Matrix4(),
      v: new THREE.Vector3(),
    }),
    [],
  );
  const assemble = (x: number) => {
    const { m, t, s: local, v } = scratch;
    const set = (
      name: string,
      list: THREE.Matrix4[],
      pose: (i: number, base: THREE.Matrix4) => void,
    ) => {
      const mesh = instances.current[name];
      if (!mesh) return;
      list.forEach((base, i) => {
        pose(i, base);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    set("coils", layoutRing.coils, (i, base) => {
      const r = 1 - easeOut(step(x, 0.1 + i * 0.035, 0.24));
      v.setFromMatrixPosition(base).setZ(0).normalize();
      t.makeTranslation(v.x * 2.8 * r, v.y * 2.8 * r, 0.9 * r);
      m.copy(t)
        .multiply(base)
        .multiply(local.makeRotationZ(r * 1.1));
    });
    set("clamps", layoutRing.clamps, (i, base) => {
      const r = 1 - easeOut(step(x, 0.24 + (i >> 1) * 0.035, 0.18));
      m.makeTranslation(0, 0, 1.4 * r).multiply(base);
    });
    set("bolts", layoutRing.bolts, (i, base) => {
      const e = Math.max(
        1e-3,
        easeBack(step(x, 0.46 + (i >> 2) * 0.025, 0.12)),
      );
      m.copy(base).multiply(local.makeScale(e, e, e));
    });
    const glass = (i: number, base: THREE.Matrix4) => {
      const e = easeOut(step(x, 0.28 + i * 0.035, 0.22));
      const k = 0.6 + 0.4 * e;
      m.makeTranslation(0, 0, 2.4 * (1 - e))
        .multiply(base)
        .multiply(local.makeScale(k, k, k));
    };
    set("glassCore", layoutRing.glass, glass);
    set("glassShell", layoutRing.glass, glass);
    const fitting =
      (delay: number, per: number) => (i: number, base: THREE.Matrix4) => {
        const e = Math.max(
          1e-3,
          easeBack(step(x, delay + Math.floor(i / per) * 0.03, 0.14)),
        );
        m.makeTranslation(0, 0, 0.9 * (1 - e))
          .multiply(base)
          .multiply(local.makeScale(e, e, e));
      };
    set("brackets", layoutRing.brackets, fitting(0.72, 1));
    set("ridges", layoutRing.ridges, fitting(0.76, 3));
    set("screws", layoutRing.screws, fitting(0.78, 2));
    if (body.current) {
      const e = easeOut(step(x, 0, 0.22));
      body.current.scale.set(0.8 + 0.2 * e, 0.8 + 0.2 * e, Math.max(0.02, e));
    }
    if (wires.current) {
      const e = easeOut(step(x, 0.5, 0.2));
      wires.current.scale.setScalar(1 + (1 - e) * 0.25);
      wires.current.visible = e > 0.01;
    }
    if (slotted.current) {
      const e = easeOut(step(x, 0.52, 0.26));
      slotted.current.rotation.z = -(1 - e) * 1.8;
      slotted.current.position.z = (1 - e) * 1.8;
      slotted.current.scale.setScalar(0.85 + 0.15 * e);
    }
    tunnelRings.current.forEach((ring, i) => {
      if (!ring) return;
      const e = easeOut(step(x, 0.66 + i * 0.035, 0.16));
      ring.position.z = 0.1 - i * 0.12 + (1 - e) * 1.4;
      ring.visible = e > 0.001;
    });
    if (bezel.current)
      bezel.current.scale.setScalar(
        Math.max(1e-3, easeBack(step(x, 0.84, 0.12))),
      );
  };

  useEffect(() => {
    element.current = document.querySelector(".hero");
    parts.monogramMaterial.uniforms.uMap.value = parts.monogram;
    // Redraw in the real face once web fonts have loaded.
    let live = true;
    document.fonts?.ready.then(() => {
      if (!live) return;
      drawMonogram(parts.monogram.image as HTMLCanvasElement);
      parts.monogram.needsUpdate = true;
    });
    const turn = (event: Event) => {
      if (getCoreState().phase === "charging") return;
      const d = (event as CustomEvent<{ x: number; y: number }>).detail;
      drag.current.y = THREE.MathUtils.clamp(drag.current.y + d.x, -0.9, 0.9);
      drag.current.x = THREE.MathUtils.clamp(drag.current.x + d.y, -0.7, 0.7);
    };
    window.addEventListener("core-turn", turn);
    return () => {
      live = false;
      window.removeEventListener("core-turn", turn);
      for (const value of Object.values(parts)) {
        if (Array.isArray(value)) value.forEach((m) => m.dispose());
        else if ("dispose" in value) (value as { dispose(): void }).dispose();
      }
      sparks.geometry.dispose();
      sparks.material.dispose();
    };
  }, [parts, sparks]);

  const color = useMemo(() => new THREE.Color(), []);
  useFrame(({ gl }, delta) => {
    if (!active.current) return;
    const dt = Math.min(delta, 0.04);
    const m = motion.current;
    m.time += dt;
    const t = m.time;
    const phase = element.current?.dataset.ignition;
    const ignition =
      phase === "waiting"
        ? 0
        : phase === "running"
          ? THREE.MathUtils.clamp(
              (performance.now() -
                Number(element.current?.dataset.ignitionStart)) /
                CORE_IGNITION_MS,
              0,
              1,
            )
          : 1;
    const settle = THREE.MathUtils.smootherstep(ignition, 0.18, 1);
    const arrival = THREE.MathUtils.smootherstep(ignition, 0.3, 0.9);
    // Parts are visible from the first moment of the build.
    const present = THREE.MathUtils.smootherstep(ignition, 0, 0.3);
    if (ignition < 1 || !built.current) {
      assemble(ignition);
      built.current = ignition >= 1;
    }
    const core = getCoreState();
    const now = performance.now();
    const frame = sampleCore(core, now);

    // Power-up nerves: the output stutters just before the core fires.
    let flicker = 1;
    if (core.phase === "charging") {
      const p = (now - core.startedAt) / CORE_TIMING.charging;
      const window_ =
        THREE.MathUtils.smoothstep(p, 0.62, 0.72) *
        (1 - THREE.MathUtils.smoothstep(p, 0.95, 1));
      const noise = Math.sin(Math.floor(t * 26) * 91.7) * 0.5 + 0.5;
      flicker = 1 - window_ * (noise > 0.55 ? 0.65 : 0);
    }
    // Standby: a faint breathing glow, even at rest.
    const standby = (0.2 + Math.sin(t * 1.6) * 0.05) * arrival;
    const power = (standby + frame.energy * (1 - standby)) * flicker;
    const flash = frame.flash;

    m.inflow = THREE.MathUtils.damp(
      m.inflow,
      core.phase === "charging" ? 1 : 0,
      core.phase === "charging" ? 3 : 6,
      dt,
    );
    m.orbit = THREE.MathUtils.damp(
      m.orbit,
      core.phase === "online" || core.phase === "cooling" ? frame.energy : 0,
      4,
      dt,
    );
    m.spinA += dt * (0.05 + frame.spin * 1.1);
    m.spinB -= dt * (0.035 + frame.spin * 0.7);

    // Metal arrives from darkness during the intro.
    const fade = 0.05 + 0.95 * present;
    parts.gunmetal.color.set("#3a4150").multiplyScalar(fade);
    parts.darkMetal.color.set("#1b212c").multiplyScalar(fade);
    parts.tunnelMetal.color.set("#252c39").multiplyScalar(fade);
    parts.copper.color.set("#f0a16c").multiplyScalar(fade);
    parts.glass.opacity = 0.18 * present;

    // Acrylic blocks light in order around the ring; online, a current runs.
    const blocks = glassLights.current;
    if (blocks) {
      for (let i = 0; i < COILS; i++) {
        const boot =
          ignition < 1
            ? THREE.MathUtils.clamp(ignition * 16 - i * 0.9, 0, 1) *
              (1 - THREE.MathUtils.smoothstep(ignition, 0.75, 1))
            : 0;
        const lit = THREE.MathUtils.clamp(frame.coils * COILS - i, 0, 1);
        const current =
          frame.energy * (0.18 + 0.18 * Math.sin(t * 5 - i * 0.628));
        const level =
          (0.06 * arrival + lit * 0.8 + current + boot * 0.8) * flicker +
          flash * 0.7;
        color.copy(CYAN).lerp(ICE, Math.min(1, lit * 0.25 + flash));
        blocks.setColorAt(i, color.multiplyScalar(level));
      }
      if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true;
    }
    parts.slotGlow.color
      .copy(CYAN)
      .lerp(ICE, flash * 0.6)
      .multiplyScalar(0.12 * arrival + power * 0.95);
    parts.backGlow.color.copy(CYAN).multiplyScalar(power * 0.55 + flash * 0.4);
    // The tunnel brightens from its mouth inward, pulsing when online.
    parts.tunnel.forEach((ring, i) => {
      const depthLit = THREE.MathUtils.clamp(
        frame.coils * 1.4 - i * 0.12,
        0,
        1,
      );
      const pulse =
        frame.energy * 0.25 * (0.5 + 0.5 * Math.sin(t * 6 - i * 1.1));
      ring.color
        .copy(CYAN)
        .lerp(ICE, 0.3 + flash * 0.5)
        .multiplyScalar(
          (standby * 0.9 + depthLit * 0.85 + pulse) * flicker + flash * 0.6,
        );
    });
    parts.coreMaterial.uniforms.uTime.value = t;
    parts.coreMaterial.uniforms.uPower.value = power;
    parts.coreMaterial.uniforms.uFlash.value = flash;
    // The monogram reads at rest and burns brightest as the core fires.
    // …and "SV" powers on last, once the build is complete.
    parts.monogramMaterial.uniforms.uIntensity.value =
      step(ignition, 0.86, 0.12) * (0.35 + power * 1.1) * arrival * flicker +
      flash * 1.2;
    parts.hud.color.copy(CYAN).multiplyScalar((0.06 + power * 0.45) * arrival);
    parts.coreGlow.uniforms.uIntensity.value =
      0.16 + power * 0.75 + flash * 0.7;
    parts.heroWash.uniforms.uIntensity.value =
      (0.04 * arrival + frame.energy * 0.27) * flicker + flash * 0.3;
    parts.rays.uniforms.uTime.value = t;
    parts.rays.uniforms.uIntensity.value =
      frame.energy * 0.58 * flicker + flash * 1.0;
    sparks.material.uniforms.uTime.value = t;
    sparks.material.uniforms.uInflow.value = m.inflow;
    sparks.material.uniforms.uOrbit.value = m.orbit;
    sparks.material.uniforms.uDpr.value = gl.getPixelRatio();
    if (light.current)
      light.current.intensity =
        (3 + frame.energy * 14 * flicker + flash * 22) * arrival;
    if (hudA.current) hudA.current.rotation.z = m.spinA;
    if (hudB.current) hudB.current.rotation.z = m.spinB;
    if (wave.current) {
      const online = core.phase === "online" ? flash : 0;
      wave.current.visible = online > 0.001;
      wave.current.scale.setScalar(2.5 + (1 - online) * 2.4);
      parts.waveMaterial.color.copy(ICE).multiplyScalar(online * 0.9);
    }

    if (!root.current || !tilt.current) return;
    const r = layout.section;
    const mobile = !!r && r.width < 768;
    const halfWidth = 2.99 * (r ? r.width / r.height : 1.8);
    root.current.position.set(
      mobile ? 0 : halfWidth * 0.4 * settle,
      (mobile ? -0.35 : 0.05) * settle,
      0,
    );
    const scale =
      (mobile ? 0.5 : 0.84) *
      (1 + (1 - settle) * 0.22) *
      (1 + frame.energy * 0.03 + flash * 0.04);
    root.current.scale.setScalar(scale);
    // Three-quarter view: its face turned slightly away so the drum and the
    // blocks show their depth, following the pointer and any drag.
    tilt.current.rotation.x = THREE.MathUtils.damp(
      tilt.current.rotation.x,
      0.1 -
        pointer.y * 0.2 * settle +
        drag.current.x +
        Math.sin(t * 0.4) * 0.03,
      4,
      dt,
    );
    tilt.current.rotation.y = THREE.MathUtils.damp(
      tilt.current.rotation.y,
      (mobile ? 0.25 : 0.42) +
        pointer.x * 0.26 * settle +
        drag.current.y +
        Math.sin(t * 0.3) * 0.06,
      4,
      dt,
    );
    if (wash.current)
      wash.current.position.set(
        root.current.position.x,
        root.current.position.y,
        -2,
      );
  });

  return (
    <>
      {/* Light cast onto the hero around the reactor. */}
      <mesh
        ref={wash}
        geometry={parts.plane}
        material={parts.heroWash}
        scale={26}
        renderOrder={-2}
      />
      <group ref={root}>
        <group ref={tilt}>
          <pointLight
            ref={light}
            position={[0, 0, 1.6]}
            color="#6fd6ff"
            distance={10}
            decay={2}
          />
          <mesh
            geometry={parts.plane}
            material={parts.rays}
            scale={9}
            position={[0, 0, -0.8]}
            renderOrder={-1}
          />
          <mesh
            geometry={parts.plane}
            material={parts.coreGlow}
            scale={6.8}
            position={[0, 0, -0.7]}
            renderOrder={-1}
          />
          {/* Housing: a thick drum behind the ring. */}
          <group ref={body}>
            <mesh
              geometry={parts.housing}
              material={parts.darkMetal}
              position={[0, 0, -0.3]}
            />
            <mesh
              geometry={parts.face}
              material={parts.darkMetal}
              position={[0, 0, 0.06]}
            />
            <mesh
              geometry={parts.tunnelWall}
              material={parts.tunnelMetal}
              position={[0, 0, -0.25]}
            />
            <mesh
              geometry={parts.backPlate}
              material={parts.darkMetal}
              position={[0, 0, -0.56]}
            />
          </group>
          {/* Outer ring: copper coils in clamps, alternating with acrylic. */}
          <instancedMesh
            args={[parts.coil, parts.copper, COILS]}
            ref={place("coils", layoutRing.coils)}
          />
          <instancedMesh
            args={[parts.clamp, parts.darkMetal, COILS * 2]}
            ref={place("clamps", layoutRing.clamps)}
          />
          <instancedMesh
            args={[parts.bolt, parts.blackGloss, COILS * 4]}
            ref={place("bolts", layoutRing.bolts)}
          />
          <instancedMesh
            args={[parts.glassCore, parts.glassGlow, COILS]}
            ref={(mesh) => {
              glassLights.current = mesh;
              place("glassCore", layoutRing.glass)(mesh);
              if (mesh)
                for (let i = 0; i < COILS; i++) mesh.setColorAt(i, CYAN);
            }}
          />
          <instancedMesh
            args={[parts.glassShell, parts.glass, COILS]}
            ref={place("glassShell", layoutRing.glass)}
            renderOrder={1}
          />
          {/* Wire runs linking the bolts, outside and inside the ring. */}
          <group ref={wires}>
            <mesh
              geometry={parts.wire}
              material={parts.blackGloss}
              scale={[2.44, 2.44, 1]}
              position={[0, 0, 0.35]}
            />
            <mesh
              geometry={parts.wire}
              material={parts.blackGloss}
              scale={[1.55, 1.55, 1]}
              position={[0, 0, 0.35]}
            />
          </group>
          {/* Slotted gunmetal ring with light behind its slots. */}
          <group ref={slotted}>
            <mesh
              geometry={parts.slotLight}
              material={parts.slotGlow}
              position={[0, 0, 0.1]}
            />
            <mesh
              geometry={parts.slotted}
              material={parts.gunmetal}
              position={[0, 0, 0.14]}
            />
          </group>
          <instancedMesh
            args={[parts.bracket, parts.darkMetal, 3]}
            ref={place("brackets", layoutRing.brackets)}
          />
          <instancedMesh
            args={[parts.ridge, parts.gunmetal, 9]}
            ref={place("ridges", layoutRing.ridges)}
          />
          <instancedMesh
            args={[parts.screw, parts.blackGloss, 6]}
            ref={place("screws", layoutRing.screws)}
          />
          {/* Light tunnel: stepped rings receding to the meshed core. */}
          {parts.tunnel.map((material, i) => (
            <mesh
              key={i}
              ref={(mesh) => {
                tunnelRings.current[i] = mesh;
              }}
              geometry={parts.tunnelRing}
              material={material}
              scale={[1 - i * 0.075, 1 - i * 0.075, 1]}
              position={[0, 0, 0.1 - i * 0.12]}
            />
          ))}
          <mesh
            ref={bezel}
            geometry={parts.bezel}
            material={parts.gunmetal}
            position={[0, 0, 0.16]}
          />
          <mesh
            geometry={parts.backLight}
            material={parts.backGlow}
            position={[0, 0, -0.52]}
          />
          <mesh
            geometry={parts.core}
            material={parts.coreMaterial}
            position={[0, 0, -0.48]}
          />
          <mesh
            geometry={parts.plane}
            material={parts.monogramMaterial}
            scale={1.02}
            position={[0, 0, -0.4]}
          />
          <lineSegments ref={hudA} geometry={parts.hudA} material={parts.hud} />
          <lineSegments ref={hudB} geometry={parts.hudB} material={parts.hud} />
          <mesh
            ref={wave}
            geometry={parts.wave}
            material={parts.waveMaterial}
            position={[0, 0, 0.45]}
          />
          <points
            geometry={sparks.geometry}
            material={sparks.material}
            frustumCulled={false}
            renderOrder={2}
          />
        </group>
      </group>
    </>
  );
}
