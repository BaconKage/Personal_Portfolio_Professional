import * as THREE from "three";
import type { SceneId } from "@/components/Artwork";

/**
 * A project card drawn as a flexible sheet (after lusion.co's reel panel).
 * The card's world renders into a texture; a 32×32 plane carries it from a
 * small "from" rect into the card's DOM rect. Each vertex lands on its own
 * schedule, so the edges bend and stretch until the sheet settles flat, and
 * the image blooms from brand blue into full colour as it arrives.
 */

type Background = {
  inner: string;
  mid: string;
  outer: string;
  center: [number, number];
};
const flat = (color: string): Background => ({
  inner: color,
  mid: color,
  outer: color,
  center: [0.5, 0.5],
});
// Mirrors each card's CSS background (app/globals.css .project-*).
const backgrounds: Partial<Record<SceneId, Background>> = {
  mygym: {
    inner: "#344974",
    mid: "#141e31",
    outer: "#101622",
    center: [0.55, 0.7],
  },
  vanicert: flat("#080b16"),
  "firstdrop-ai": flat("#201a19"),
  bhashabuddy: {
    inner: "#1f5446",
    mid: "#123a31",
    outer: "#0b2620",
    center: [0.4, 0.6],
  },
};
// Raw sRGB, composited after the scene is converted to output space.
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255,
  );
};

const vertexShader = /* glsl */ `
uniform vec2 u_domXYFrom;
uniform vec2 u_domWHFrom;
uniform vec2 u_domXY;
uniform vec2 u_domWH;
uniform vec2 u_viewport;
uniform float u_showRatio;
varying vec2 v_uv;
varying vec2 v_domWH;
varying float v_showRatio;
void main() {
  // p: 0..1 across the card, y pointing down like the DOM.
  vec2 p = vec2(position.x + 0.5, 0.5 - position.y);
  // Top-right lands first, bottom-left last: the stagger bends the edges.
  float placementWeight = 1.0 - (pow(p.x * p.x, 0.75) + pow(1.0 - p.y, 1.5)) / 2.0;
  v_showRatio = smoothstep(placementWeight * 0.3, 0.7 + placementWeight * 0.3, u_showRatio);
  vec2 domXY = mix(u_domXYFrom, u_domXY, v_showRatio);
  vec2 domWH = mix(u_domWHFrom, u_domWH, v_showRatio);
  domXY.x += mix(domWH.x, 0.0, cos(v_showRatio * 6.2831853) * 0.5 + 0.5) * 0.1;
  vec2 pivot = domWH * 0.5;
  vec2 base = p * domWH - pivot;
  // A slight twist that unwinds as it lands.
  float rot = (smoothstep(0.0, 1.0, v_showRatio) - v_showRatio) * -1.0;
  float s = sin(rot), c = cos(rot);
  base = vec2(c * base.x - s * base.y, s * base.x + c * base.y);
  vec2 screen = base + pivot + domXY;
  gl_Position = vec4(
    screen.x / u_viewport.x * 2.0 - 1.0,
    1.0 - screen.y / u_viewport.y * 2.0,
    0.0,
    1.0
  );
  v_uv = vec2(p.x, 1.0 - p.y);
  v_domWH = domWH;
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D u_texture;
uniform vec3 u_bgInner;
uniform vec3 u_bgMid;
uniform vec3 u_bgOuter;
uniform vec2 u_bgCenter;
uniform vec3 u_tint;
uniform float u_radius;
uniform float u_hover;
uniform vec2 u_mouse;
varying vec2 v_uv;
varying vec2 v_domWH;
varying float v_showRatio;
float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
void main() {
  float d = sdRoundedBox((v_uv - 0.5) * v_domWH, v_domWH * 0.5, u_radius);
  float alpha = clamp(0.5 - d / max(fwidth(d), 1e-4), 0.0, 1.0);
  // The card's own background (CSS radial-gradient, farthest-corner).
  vec2 q = vec2(v_uv.x, 1.0 - v_uv.y);
  vec2 extent = max(u_bgCenter, 1.0 - u_bgCenter) * 1.41421356;
  float g = length((q - u_bgCenter) / extent);
  vec3 bg = mix(u_bgInner, u_bgMid, clamp(g / 0.48, 0.0, 1.0));
  bg = mix(bg, u_bgOuter, clamp((g - 0.48) / 0.32, 0.0, 1.0));
  // Hover: the image eases toward the cursor inside a thin frame of the
  // card's own background, as if the card leaned in.
  vec2 m = vec2(u_mouse.x, 1.0 - u_mouse.y);
  vec2 worldUv = m + (v_uv - m) * (1.0 - 0.05 * u_hover);
  float border = u_hover * min(v_domWH.x, v_domWH.y) * 0.022;
  float inner = sdRoundedBox((v_uv - 0.5) * v_domWH, v_domWH * 0.5 - border, max(u_radius - border * 0.3, 4.0));
  float inside = clamp(0.5 - inner / max(fwidth(inner), 1e-4), 0.0, 1.0);
  // The world was rendered linear onto transparent black; finish it here.
  vec4 world = texture2D(u_texture, worldUv) * inside;
  vec3 light = world.rgb;
  #ifdef TONE_MAPPING
  light = toneMapping(light);
  #endif
  light = linearToOutputTexel(vec4(light, 1.0)).rgb;
  vec3 color = light + bg * (1.0 - world.a);
  vec3 tinted = max(u_tint, vec3(dot(color, vec3(0.299, 0.587, 0.114))));
  gl_FragColor = vec4(mix(tinted, color, v_showRatio), alpha);
}`;

const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);

export type ProjectSheet = ReturnType<typeof createProjectSheet>;

export function createProjectSheet(
  renderer: THREE.WebGLRenderer,
  id: SceneId,
  samples = 4,
) {
  const bg = backgrounds[id] ?? flat("#101621");
  const target = new THREE.WebGLRenderTarget(1, 1, {
    samples,
    depthBuffer: true,
    stencilBuffer: false,
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const uniforms = {
    u_texture: { value: target.texture },
    u_domXYFrom: { value: new THREE.Vector2() },
    u_domWHFrom: { value: new THREE.Vector2(1, 1) },
    u_domXY: { value: new THREE.Vector2() },
    u_domWH: { value: new THREE.Vector2(1, 1) },
    u_viewport: { value: new THREE.Vector2(1, 1) },
    u_showRatio: { value: 0 },
    u_bgInner: { value: rgb(bg.inner) },
    u_bgMid: { value: rgb(bg.mid) },
    u_bgOuter: { value: rgb(bg.outer) },
    u_bgCenter: { value: new THREE.Vector2(...bg.center) },
    u_tint: { value: rgb("#2f55ff") },
    u_radius: { value: 12 },
    u_hover: { value: 0 },
    u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.Camera();
  const clearColor = new THREE.Color();

  return {
    /**
     * Compile every program this sheet will use before it is first drawn:
     * the world's own materials as they render into the sheet texture (no
     * tone mapping, linear output: different programs from on-screen ones),
     * and the sheet itself. Linking on first use stalls a frame for 50-200ms.
     */
    compile(world: THREE.Scene, worldCamera: THREE.Camera) {
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      const materials = renderer.compile(world, worldCamera);
      renderer.setRenderTarget(previous);
      renderer.compile(scene, camera).forEach((m) => materials.add(m));
      return materials;
    },
    /**
     * Render `world` into the sheet texture, then draw the sheet on screen.
     * `rect` is the card's DOM rect; `ratio` 0..1 is how far it has landed.
     */
    render(
      world: THREE.Scene,
      worldCamera: THREE.Camera,
      rect: DOMRectReadOnly,
      ratio: number,
      viewportWidth: number,
      viewportHeight: number,
      // Untransformed size: a CSS zoom scales the sheet, not its texture.
      layout: { width: number; height: number } = rect,
      // Hover amount 0..1 and the pointer in card space (0..1, y down).
      hover = { amount: 0, x: 0.5, y: 0.5 },
    ) {
      uniforms.u_hover.value = hover.amount;
      uniforms.u_mouse.value.set(hover.x, hover.y);
      const dpr = renderer.getPixelRatio();
      const w = Math.max(1, Math.ceil(layout.width * dpr)),
        h = Math.max(1, Math.ceil(layout.height * dpr));
      if (target.width !== w || target.height !== h) target.setSize(w, h);
      const alpha = renderer.getClearAlpha();
      renderer.getClearColor(clearColor);
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, true);
      renderer.render(world, worldCamera);
      renderer.setRenderTarget(null);
      renderer.setClearColor(clearColor, alpha);

      uniforms.u_domXY.value.set(rect.left, rect.top);
      uniforms.u_domWH.value.set(rect.width, rect.height);
      // It unfurls from a smaller panel low in the card.
      uniforms.u_domXYFrom.value.set(
        rect.left + rect.width * 0.12,
        rect.top + rect.height * 0.42,
      );
      uniforms.u_domWHFrom.value.set(rect.width * 0.5, rect.height * 0.4);
      uniforms.u_viewport.value.set(viewportWidth, viewportHeight);
      uniforms.u_showRatio.value = ratio;
      renderer.render(scene, camera);
    },
    dispose() {
      target.dispose();
      material.dispose();
    },
  };
}
