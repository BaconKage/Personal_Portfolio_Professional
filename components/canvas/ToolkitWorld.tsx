/* eslint-disable react-hooks/immutability -- Buffers, materials and DOM labels are mutable state owned by the render loop. */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { SceneProps } from "./types";
import { projects } from "@/data/projects";
import { buildToolkit, litBy } from "@/lib/toolkit";

/**
 * The toolkit constellation. Projects are bright hubs; every technology in
 * their stacks is a star wired to the projects that used it, with particles
 * flowing along each wire into the project. Hover (or the list beside it)
 * lights a node's connections; drag turns it; tap pins a tool or opens a
 * project. Labels are DOM text placed over the projected nodes.
 */
const toolkit = buildToolkit(projects);
const FLOW = 14; // particles per wire

// Light that adds to the page without darkening it (as in the hero): the
// canvas is transparent, so each fragment's alpha is its own brightness.
// Plain additive blending also adds alpha, which turned faint glow into
// opaque near-black over the stage's gradient.
const additive = {
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
} as const;
const lightOut =
  "gl_FragColor = vec4(c, clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0));";

const glowVertex = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aLit;
uniform float uScale;
uniform float uDim;
varying vec3 vColor;
varying float vLit;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // Lit nodes swell a little; perspective keeps near stars larger.
  gl_PointSize = aSize * uScale * (1.0 + aLit * 0.45) * (12.0 / -mv.z);
  vColor = aColor;
  vLit = mix(1.0 - uDim * 0.78, 1.0, aLit);
}`;
const glowFragment = /* glsl */ `
varying vec3 vColor;
varying float vLit;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float core = smoothstep(0.3, 0.0, d);
  float halo = exp(-d * d * 5.0);
  vec3 c = mix(vColor * halo * 0.9, vec3(1.0), core * 0.85) * vLit;
  ${lightOut}
}`;

const wireVertex = /* glsl */ `
attribute vec3 aColor;
attribute float aLit;
uniform float uDim;
varying vec3 vColor;
varying float vAlpha;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vColor = aColor;
  vAlpha = mix(0.16 - uDim * 0.1, 0.75, aLit);
}`;
const wireFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 c = vColor * vAlpha;
  ${lightOut}
}`;

const flowVertex = /* glsl */ `
attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec3 aColor;
attribute float aPhase;
attribute float aLit;
uniform float uTime;
uniform float uScale;
uniform float uDim;
varying vec3 vColor;
varying float vAlpha;
void main() {
  // Data flows from each tool into the project that used it.
  float t = fract(aPhase + uTime * mix(0.06, 0.22, aLit));
  vec4 mv = modelViewMatrix * vec4(mix(aFrom, aTo, t), 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uScale * mix(0.12, 0.2, aLit) * (12.0 / -mv.z);
  vColor = aColor;
  vAlpha = sin(t * 3.14159) * mix(0.18 - uDim * 0.14, 1.0, aLit);
}`;
const dotFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  vec3 c = vColor * vAlpha * (1.0 - d * d);
  ${lightOut}
}`;

const dustVertex = /* glsl */ `
attribute float aSize;
uniform float uScale;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale * (12.0 / -mv.z);
  vAlpha = 0.35;
}`;
const dustFragment = /* glsl */ `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  vec3 c = vec3(0.62, 0.72, 1.0) * vAlpha * (1.0 - d);
  ${lightOut}
}`;

/** A small deterministic generator for the dust field. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export default function ToolkitWorld({
  element,
  camera,
  layout,
  active,
  pointer,
}: SceneProps) {
  const gl = useThree((state) => state.gl);
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const nodeCount = toolkit.nodes.length;
  const edgeCount = toolkit.edges.length;

  const parts = useMemo(() => {
    const color = new THREE.Color();
    // Stars.
    const nodePositions = new Float32Array(nodeCount * 3);
    const nodeColors = new Float32Array(nodeCount * 3);
    const nodeSizes = new Float32Array(nodeCount);
    toolkit.nodes.forEach((n, i) => {
      nodePositions.set([n.x, n.y, n.z], i * 3);
      color.set(n.color);
      nodeColors.set([color.r, color.g, color.b], i * 3);
      nodeSizes[i] =
        n.kind === "project" ? 0.9 : 0.5 + 0.12 * (n.links.length - 1);
    });
    const nodeLit = new THREE.BufferAttribute(new Float32Array(nodeCount), 1);
    nodeLit.setUsage(THREE.DynamicDrawUsage);
    const nodes = new THREE.BufferGeometry();
    nodes.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    nodes.setAttribute("aColor", new THREE.BufferAttribute(nodeColors, 3));
    nodes.setAttribute("aSize", new THREE.BufferAttribute(nodeSizes, 1));
    nodes.setAttribute("aLit", nodeLit);
    const uniforms = {
      uScale: { value: 40 },
      uDim: { value: 0 },
      uTime: { value: 0 },
    };
    const nodeMaterial = new THREE.ShaderMaterial({
      vertexShader: glowVertex,
      fragmentShader: glowFragment,
      uniforms,
      ...additive,
    });

    // Wires: tool end in its family colour, project end in the project's.
    const wirePositions = new Float32Array(edgeCount * 6);
    const wireColors = new Float32Array(edgeCount * 6);
    toolkit.edges.forEach(([tool, hub], e) => {
      const a = toolkit.nodes[tool],
        b = toolkit.nodes[hub];
      wirePositions.set([a.x, a.y, a.z, b.x, b.y, b.z], e * 6);
      color.set(a.color);
      wireColors.set([color.r, color.g, color.b], e * 6);
      color.set(b.color);
      wireColors.set([color.r, color.g, color.b], e * 6 + 3);
    });
    const wireLit = new THREE.BufferAttribute(
      new Float32Array(edgeCount * 2),
      1,
    );
    wireLit.setUsage(THREE.DynamicDrawUsage);
    const wires = new THREE.BufferGeometry();
    wires.setAttribute("position", new THREE.BufferAttribute(wirePositions, 3));
    wires.setAttribute("aColor", new THREE.BufferAttribute(wireColors, 3));
    wires.setAttribute("aLit", wireLit);
    const wireMaterial = new THREE.ShaderMaterial({
      vertexShader: wireVertex,
      fragmentShader: wireFragment,
      uniforms,
      ...additive,
    });

    // Flow particles along every wire.
    const flowCount = edgeCount * FLOW;
    const from = new Float32Array(flowCount * 3),
      to = new Float32Array(flowCount * 3),
      flowColors = new Float32Array(flowCount * 3),
      phases = new Float32Array(flowCount);
    toolkit.edges.forEach(([tool, hub], e) => {
      const a = toolkit.nodes[tool],
        b = toolkit.nodes[hub];
      color.set(a.color).lerp(new THREE.Color(b.color), 0.35);
      for (let k = 0; k < FLOW; k++) {
        const i = e * FLOW + k;
        from.set([a.x, a.y, a.z], i * 3);
        to.set([b.x, b.y, b.z], i * 3);
        flowColors.set([color.r, color.g, color.b], i * 3);
        phases[i] = k / FLOW + e * 0.137;
      }
    });
    const flowLit = new THREE.BufferAttribute(new Float32Array(flowCount), 1);
    flowLit.setUsage(THREE.DynamicDrawUsage);
    const flow = new THREE.BufferGeometry();
    // Positions are computed in the shader; this only sizes the draw.
    flow.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(flowCount * 3), 3),
    );
    flow.setAttribute("aFrom", new THREE.BufferAttribute(from, 3));
    flow.setAttribute("aTo", new THREE.BufferAttribute(to, 3));
    flow.setAttribute("aColor", new THREE.BufferAttribute(flowColors, 3));
    flow.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    flow.setAttribute("aLit", flowLit);
    flow.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    const flowMaterial = new THREE.ShaderMaterial({
      vertexShader: flowVertex,
      fragmentShader: dotFragment,
      uniforms,
      ...additive,
    });

    // Dust for depth.
    const random = seeded(29);
    const dustCount = 260;
    const dustPositions = new Float32Array(dustCount * 3),
      dustSizes = new Float32Array(dustCount);
    for (let i = 0; i < dustCount; i++) {
      const theta = random() * Math.PI * 2,
        phi = Math.acos(random() * 2 - 1),
        r = 4.5 + random() * 4;
      dustPositions.set(
        [
          Math.sin(phi) * Math.cos(theta) * r * 1.4,
          Math.sin(phi) * Math.sin(theta) * r * 0.8,
          Math.cos(phi) * r - 2,
        ],
        i * 3,
      );
      dustSizes[i] = 0.05 + random() * 0.08;
    }
    const dust = new THREE.BufferGeometry();
    dust.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    dust.setAttribute("aSize", new THREE.BufferAttribute(dustSizes, 1));
    const dustMaterial = new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      uniforms,
      ...additive,
    });
    return {
      uniforms,
      nodes,
      nodeMaterial,
      nodeLit,
      wires,
      wireMaterial,
      wireLit,
      flow,
      flowMaterial,
      flowLit,
      dust,
      dustMaterial,
    };
  }, [nodeCount, edgeCount]);

  useEffect(
    () => () => {
      parts.nodes.dispose();
      parts.nodeMaterial.dispose();
      parts.wires.dispose();
      parts.wireMaterial.dispose();
      parts.flow.dispose();
      parts.flowMaterial.dispose();
      parts.dust.dispose();
      parts.dustMaterial.dispose();
    },
    [parts],
  );

  // Interaction state, shared between DOM events and the frame loop.
  const state = useRef({
    time: 0,
    pointerX: -1,
    pointerY: -1,
    hovered: -1,
    focused: -1,
    pinned: -1,
    active: -2,
    shownPin: -2,
    yaw: 0,
    yawVelocity: 0,
    dragging: false,
    dragX: 0,
    moved: 0,
    pointerId: -1,
    dim: 0,
    lit: new Float32Array(nodeCount),
    litTarget: new Float32Array(nodeCount),
    edgeLit: new Float32Array(edgeCount),
    edgeTarget: new Float32Array(edgeCount),
    screen: new Float32Array(nodeCount * 2),
    placed: [] as string[],
  });
  const labels = useRef<HTMLElement[]>([]);
  const vector = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const s = state.current;
    const section = element.closest("section");
    labels.current = Array.from(
      element.querySelectorAll<HTMLElement>("[data-node]"),
    );
    const local = (event: PointerEvent) => {
      const r = element.getBoundingClientRect();
      return { x: event.clientX - r.left, y: event.clientY - r.top };
    };
    const move = (event: PointerEvent) => {
      const p = local(event);
      if (s.dragging && event.pointerId === s.pointerId) {
        const dx = p.x - s.dragX;
        s.moved += Math.abs(dx);
        s.dragX = p.x;
        s.yawVelocity = (dx / Math.max(1, element.clientWidth)) * 9;
        s.yaw += (dx / Math.max(1, element.clientWidth)) * 1.6;
      }
      s.pointerX = p.x;
      s.pointerY = p.y;
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const p = local(event);
      s.dragging = true;
      s.pointerId = event.pointerId;
      s.dragX = p.x;
      s.moved = 0;
      s.pointerX = p.x;
      s.pointerY = p.y;
      if (event.pointerType === "mouse")
        element.setPointerCapture(event.pointerId);
    };
    const up = (event: PointerEvent) => {
      if (!s.dragging || event.pointerId !== s.pointerId) return;
      s.dragging = false;
      if (element.hasPointerCapture(event.pointerId))
        element.releasePointerCapture(event.pointerId);
      if (s.moved > 6) return;
      // A tap: open a project, pin or unpin a tool, or clear on empty space.
      const hit = nearest(local(event).x, local(event).y);
      const node = hit >= 0 ? toolkit.nodes[hit] : null;
      if (node?.kind === "project")
        section
          ?.querySelector<HTMLAnchorElement>(
            `[data-toolkit-project="${node.slug}"]`,
          )
          ?.click();
      else s.pinned = hit >= 0 && hit !== s.pinned ? hit : -1;
    };
    const cancel = () => {
      s.dragging = false;
    };
    const leave = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      s.pointerX = s.pointerY = -1;
    };
    // The list beside the stage drives the same highlight.
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ index: number; pin?: boolean }>)
        .detail;
      if (detail.pin) s.pinned = s.pinned === detail.index ? -1 : detail.index;
      else s.focused = detail.index;
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", cancel);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("toolkit-focus", focus);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", cancel);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("toolkit-focus", focus);
      labels.current.forEach((label) => {
        label.removeAttribute("style");
        delete label.dataset.state;
      });
      section?.querySelectorAll<HTMLElement>("[data-tool]").forEach((b) => {
        delete b.dataset.state;
        b.setAttribute("aria-pressed", "false");
      });
      element.style.cursor = "";
      delete element.dataset.active;
    };
    function nearest(x: number, y: number) {
      let best = -1,
        bestDistance = Infinity;
      for (let i = 0; i < toolkit.nodes.length; i++) {
        const dx = s.screen[i * 2] - x,
          dy = s.screen[i * 2 + 1] - y;
        const reach = toolkit.nodes[i].kind === "project" ? 34 : 24;
        const d = dx * dx + dy * dy;
        if (d < reach * reach && d < bestDistance) {
          best = i;
          bestDistance = d;
        }
      }
      return best;
    }
  }, [element]);

  useFrame((_, delta) => {
    if (!active.current) return;
    const rect = layout.rect;
    if (
      !rect ||
      rect.width < 1 ||
      rect.height < 1 ||
      !outer.current ||
      !inner.current
    )
      return;
    if (rect.bottom <= 0 || rect.top >= innerHeight) return;
    const s = state.current;
    const dt = Math.min(delta, 0.05);
    s.time += dt;
    parts.uniforms.uTime.value = s.time;

    // Fit the constellation to the stage; portrait stages stand it upright.
    const height =
      2 *
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
      camera.position.z;
    const width = height * (rect.width / rect.height);
    const portrait = rect.width < rect.height;
    const ex = portrait ? toolkit.extent.y : toolkit.extent.x;
    const ey = portrait ? toolkit.extent.x : toolkit.extent.y;
    const fit = Math.min((width * 0.82) / (2 * ex), (height * 0.76) / (2 * ey));
    inner.current.rotation.z = portrait ? Math.PI / 2 : 0;
    inner.current.scale.setScalar(fit);
    // Point and particle sizes follow the canvas's real pixel scale.
    parts.uniforms.uScale.value =
      (rect.height / height) * gl.getPixelRatio() * fit * 0.55;

    // Turning: a slow sway, drag with inertia, then a spring back home so
    // the labels never end up edge-on.
    if (!s.dragging) {
      s.yaw += s.yawVelocity * dt;
      s.yawVelocity *= Math.exp(-dt * 3.5);
      s.yaw += (0 - s.yaw) * (1 - Math.exp(-dt * 1.2));
    }
    s.yaw = THREE.MathUtils.clamp(s.yaw, -0.9, 0.9);
    const tilt = pointer.y * 0.12;
    outer.current.rotation.set(
      THREE.MathUtils.damp(
        outer.current.rotation.x,
        -tilt + Math.sin(s.time * 0.11) * 0.06,
        3,
        dt,
      ),
      s.yaw + Math.sin(s.time * 0.15) * 0.22,
      0,
    );
    outer.current.updateMatrixWorld(true);

    // Project every node to stage pixels, for labels and hit-testing.
    const labelsList = labels.current;
    for (let i = 0; i < toolkit.nodes.length; i++) {
      const n = toolkit.nodes[i];
      vector
        .set(n.x, n.y, n.z)
        .applyMatrix4(inner.current.matrixWorld)
        .project(camera);
      const x = (vector.x + 1) * 0.5 * rect.width,
        y = (1 - vector.y) * 0.5 * rect.height;
      s.screen[i * 2] = x;
      s.screen[i * 2 + 1] = y;
      const label = labelsList[i];
      if (!label) continue;
      const place = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      if (s.placed[i] !== place) {
        s.placed[i] = place;
        label.style.transform = place;
      }
    }

    // Hover from the pointer (mouse) or the last touch.
    let hovered = -1;
    if (s.pointerX >= 0 && !s.dragging) {
      let best = Infinity;
      for (let i = 0; i < toolkit.nodes.length; i++) {
        const dx = s.screen[i * 2] - s.pointerX,
          dy = s.screen[i * 2 + 1] - s.pointerY;
        const reach = toolkit.nodes[i].kind === "project" ? 34 : 24;
        const d = dx * dx + dy * dy;
        if (d < reach * reach && d < best) {
          hovered = i;
          best = d;
        }
      }
    }
    s.hovered = hovered;
    const cursor = s.dragging ? "grabbing" : hovered >= 0 ? "pointer" : "grab";
    if (element.style.cursor !== cursor) element.style.cursor = cursor;

    const current =
      s.pinned >= 0 ? s.pinned : hovered >= 0 ? hovered : s.focused;
    // Re-sync when the highlight or the pin changes (a pin can toggle while
    // the same node stays highlighted under the pointer).
    if (current !== s.active || s.pinned !== s.shownPin) {
      s.active = current;
      s.shownPin = s.pinned;
      const { nodes, edges } = litBy(toolkit, current);
      for (let i = 0; i < toolkit.nodes.length; i++)
        s.litTarget[i] = nodes.has(i) ? 1 : 0;
      for (let e = 0; e < toolkit.edges.length; e++)
        s.edgeTarget[e] = edges.has(e) ? 1 : 0;
      // Labels and the list follow, only when the highlight changes.
      labelsList.forEach((label, i) => {
        if (current < 0) delete label.dataset.state;
        else
          label.dataset.state = nodes.has(i)
            ? i === current
              ? "active"
              : "lit"
            : "dim";
      });
      element
        .closest("section")
        ?.querySelectorAll<HTMLElement>("[data-tool]")
        .forEach((button) => {
          const i = Number(button.dataset.tool);
          if (current < 0) delete button.dataset.state;
          else
            button.dataset.state = nodes.has(i)
              ? i === current
                ? "active"
                : "lit"
              : "dim";
          button.setAttribute("aria-pressed", String(i === s.pinned));
        });
      if (current >= 0) element.dataset.active = "true";
      else delete element.dataset.active;
    }

    // Ease highlights so they bloom and fade rather than switch.
    s.dim = THREE.MathUtils.damp(s.dim, current >= 0 ? 1 : 0, 6, dt);
    parts.uniforms.uDim.value = s.dim;
    let changed = false;
    const nodeLit = parts.nodeLit.array as Float32Array;
    for (let i = 0; i < toolkit.nodes.length; i++) {
      const next = THREE.MathUtils.damp(s.lit[i], s.litTarget[i], 8, dt);
      if (Math.abs(next - s.lit[i]) > 1e-4) changed = true;
      s.lit[i] = next;
      nodeLit[i] = next;
    }
    if (changed) parts.nodeLit.needsUpdate = true;
    changed = false;
    const wireLit = parts.wireLit.array as Float32Array;
    const flowLit = parts.flowLit.array as Float32Array;
    for (let e = 0; e < toolkit.edges.length; e++) {
      const next = THREE.MathUtils.damp(s.edgeLit[e], s.edgeTarget[e], 7, dt);
      if (Math.abs(next - s.edgeLit[e]) > 1e-4) changed = true;
      s.edgeLit[e] = next;
      wireLit[e * 2] = wireLit[e * 2 + 1] = next;
      flowLit.fill(next, e * FLOW, (e + 1) * FLOW);
    }
    if (changed) {
      parts.wireLit.needsUpdate = true;
      parts.flowLit.needsUpdate = true;
    }
  });

  return (
    <group ref={outer}>
      <points
        geometry={parts.dust}
        material={parts.dustMaterial}
        frustumCulled={false}
      />
      <group ref={inner}>
        <lineSegments
          geometry={parts.wires}
          material={parts.wireMaterial}
          frustumCulled={false}
        />
        <points
          geometry={parts.flow}
          material={parts.flowMaterial}
          frustumCulled={false}
        />
        <points
          geometry={parts.nodes}
          material={parts.nodeMaterial}
          frustumCulled={false}
        />
      </group>
    </group>
  );
}
