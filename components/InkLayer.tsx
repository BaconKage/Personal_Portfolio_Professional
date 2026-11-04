"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import * as THREE from "three";
import { createScreenPaint } from "./canvas/ScreenPaint";

/**
 * Cobalt ink on the paper sections. The pointer paints into the same kind
 * of swirling field as the WebGL trail (ScreenPaint), drawn here as
 * watercolour: a soft body, pigment pooled at the stroke's edge, and a
 * little paper grain. The canvas uses `mix-blend-mode: multiply`, which can
 * only darken, so text under the ink stays as dark as it was.
 *
 * It deposits only over light surfaces; dark sections and 3D stages keep
 * the warp trail. Mouse only, and it runs only while ink is visible.
 */
const LIGHT_INK = new THREE.Color("#2f55ff");
const DEEP_INK = new THREE.Color("#1730c9");
/** How long ink stays alive after the last stroke on paper. */
const LINGER_MS = 2600;

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const fragment = /* glsl */ `
uniform sampler2D uPaint;
uniform vec2 uTexel;
uniform vec3 uLight;
uniform vec3 uDeep;
varying vec2 vUv;
float weight(vec2 uv) {
  vec4 d = texture2D(uPaint, uv);
  return d.z * 0.7 + d.w * 0.9;
}
float grainAt(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
  float w = weight(vUv);
  // Pigment gathers where a stroke's density changes, as watercolour dries.
  float gx = weight(vUv + vec2(uTexel.x, 0.0)) - weight(vUv - vec2(uTexel.x, 0.0));
  float gy = weight(vUv + vec2(0.0, uTexel.y)) - weight(vUv - vec2(0.0, uTexel.y));
  float edge = clamp(length(vec2(gx, gy)) * 3.0, 0.0, 1.0);
  float body = smoothstep(0.01, 0.4, w);
  float grain = 0.9 + grainAt(floor(gl_FragCoord.xy * 0.5)) * 0.2;
  // Kept light: a wash, not paint (previously up to 0.7).
  float a = clamp((body * 0.3 + edge * 0.16) * grain, 0.0, 0.42);
  vec3 c = mix(uLight, uDeep, clamp(w * 1.2 + edge * 0.5, 0.0, 1.0));
  // Premultiplied, onto a transparent canvas.
  gl_FragColor = vec4(c * a, a);
}`;

/** Light surface under the pointer? Dark sections and 3D stages are not. */
function createSurfaceProbe() {
  const known = new WeakMap<Element, boolean>();
  const luminance = (color: string) => {
    const m = color.match(/[\d.]+/g);
    if (!m || m.length < 3) return { lum: 1, alpha: 0 };
    const [r, g, b] = m.slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return {
      lum: 0.2126 * r + 0.7152 * g + 0.0722 * b,
      alpha: m.length > 3 ? Number(m[3]) : 1,
    };
  };
  return (x: number, y: number) => {
    const hit = document.elementFromPoint(x, y);
    if (!hit) return false;
    const cached = known.get(hit);
    if (cached !== undefined) return cached;
    let light = true;
    if (hit.closest("[data-scene], .project, dialog, .nav, .nav-float"))
      light = false;
    else
      for (let el: Element | null = hit; el; el = el.parentElement) {
        const { lum, alpha } = luminance(getComputedStyle(el).backgroundColor);
        if (alpha > 0.5) {
          light = lum > 0.5;
          break;
        }
      }
    known.set(hit, light);
    return light;
  };
}

export default function InkLayer() {
  const path = usePathname();
  const wipe = useRef<() => void>(() => {});

  // A new page starts with clean paper.
  useEffect(() => {
    wipe.current();
  }, [path]);

  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.className = "ink-layer";
    canvas.setAttribute("aria-hidden", "true");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    if (
      !renderer.capabilities.isWebGL2 ||
      !renderer.extensions.has("EXT_color_buffer_float")
    ) {
      renderer.dispose();
      return;
    }
    // Left visible while empty, like the 3D canvas (see Graphics).
    document.body.appendChild(canvas);
    // Soft ink: half a pixel per CSS pixel is plenty, and the browser's
    // upscale adds a natural bleed. A quarter of the pixels to shade.
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1) * 0.5);
    renderer.setClearColor(0x000000, 0);
    renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
    // Strokes linger longer than the warp's, then dry away.
    const paint = createScreenPaint(renderer, {
      velocityDissipation: 0.98,
      weight1Dissipation: 0.978,
      weight2Dissipation: 0.94,
      radiusScreenFraction: 1 / 20,
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
        3,
      ),
    );
    geometry.setAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2),
    );
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uPaint: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uLight: { value: LIGHT_INK },
        uDeep: { value: DEEP_INK },
      },
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
    const quad = new THREE.Mesh(geometry, material);
    quad.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(quad);
    const camera = new THREE.OrthographicCamera();

    let width = 0,
      height = 0;
    const size = () => {
      width = innerWidth;
      height = innerHeight;
      renderer.setSize(width, height, false);
      paint.resize(width, height);
      (material.uniforms.uTexel.value as THREE.Vector2).set(
        4 / Math.max(1, width),
        4 / Math.max(1, height),
      );
    };
    size();

    const onPaper = createSurfaceProbe();
    const brush = {
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      moved: false,
      light: false,
      live: false,
    };
    let raf = 0,
      last = 0,
      until = 0,
      probed = 0;

    const stop = () => {
      until = 0;
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      brush.live = false;
      renderer.setRenderTarget(null);
      renderer.clear();
    };
    const frame = (now: number) => {
      raf = 0;
      if (document.hidden) return stop();
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;
      if (!brush.live) {
        // A new stroke starts where the pointer is, not where it last was.
        paint.reset();
        brush.px = brush.x;
        brush.py = brush.y;
        brush.live = true;
      }
      paint.update(
        dt,
        brush,
        { x: brush.px, y: brush.py },
        brush.moved && brush.light,
      );
      brush.px = brush.x;
      brush.py = brush.y;
      brush.moved = false;
      material.uniforms.uPaint.value = paint.texture;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      if (now < until) raf = requestAnimationFrame(frame);
      else stop();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      brush.x = event.clientX;
      brush.y = event.clientY;
      brush.moved = true;
      const now = performance.now();
      // Hit-testing is cheap, but there is no need to do it on every event.
      if (now - probed > 40) {
        probed = now;
        brush.light = onPaper(event.clientX, event.clientY);
      }
      if (!brush.light) return;
      until = now + LINGER_MS;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    // Scrolling moves the page under a resting pointer: re-probe the surface.
    const scroll = () => {
      probed = 0;
    };
    const hide = () => {
      if (document.hidden) stop();
    };
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const resize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(size, 150);
    };
    wipe.current = stop;
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", hide);
    return () => {
      stop();
      clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", hide);
      wipe.current = () => {};
      paint.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      // Release the GPU context now rather than waiting for collection.
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return null;
}
