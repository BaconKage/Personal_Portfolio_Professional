"use client";
/* Three.js and measured scene layouts are mutable state owned by the render loop. */
/* eslint-disable react-hooks/immutability, react-hooks/refs, react-hooks/set-state-in-effect */
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import { usePathname } from "next/navigation";
import * as THREE from "three";
import type { SceneId } from "@/components/Artwork";
import type { SceneLayout, SceneProps } from "./types";
import { createRenderBudget, getRenderProfile } from "@/lib/render-budget";
import { createTransitionField } from "./TransitionField";

const loaders = {
  portal: () => import("./PortalWorld"),
  playground: () => import("./PlaygroundWorld"),
  hero: () => import("./HeroWorld"),
  mygym: () => import("./MyGymWorld"),
  vanicert: () => import("./VoiceWorld"),
  "firstdrop-ai": () => import("./ConversationWorld"),
  bhashabuddy: () => import("./LanguageWorld"),
  "posture-engine": () => import("./PostureWorld"),
};
type WorldModule = { default: React.ComponentType<SceneProps> };
const loading = new Map<SceneId, Promise<WorldModule>>();
function preload(id: SceneId) {
  if (!loading.has(id)) loading.set(id, loaders[id]());
  return loading.get(id)!;
}
const worlds = Object.fromEntries(
  Object.keys(loaders).map((id) => [id, lazy(() => preload(id as SceneId))]),
) as Record<
  SceneId,
  React.LazyExoticComponent<React.ComponentType<SceneProps>>
>;
type Slot = {
  element: HTMLElement;
  container: HTMLElement | null;
  section: HTMLElement;
  id: SceneId;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  progress: { current: number };
  step: { current: number };
  ready: boolean;
  layout: SceneLayout;
};
function deviceProfile() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return getRenderProfile({
    width: innerWidth,
    height: innerHeight,
    dpr: devicePixelRatio,
    coarse: matchMedia("(pointer: coarse)").matches,
    cores: nav.hardwareConcurrency || 8,
    memory: nav.deviceMemory || 8,
  });
}
class Boundary extends Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    document.documentElement.dataset.graphicsFallback = "scene-error";
    document
      .querySelectorAll("[data-ready]")
      .forEach((e) => e.removeAttribute("data-ready"));
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function WorldSlot({
  slot,
  quality,
  pointer,
}: {
  slot: Slot;
  quality: number;
  pointer: { x: number; y: number };
}) {
  const World = worlds[slot.id];
  useEffect(() => {
    slot.ready = true;
    return () => {
      slot.ready = false;
      delete slot.element.dataset.ready;
    };
  }, [slot]);
  return createPortal(
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 7, 6]} intensity={4} color="#ffffff" />
      <directionalLight position={[-5, 1, 2]} intensity={2.2} color="#8baaff" />
      <directionalLight position={[0, -4, -2]} intensity={1} color="#4e6fff" />
      <World
        id={slot.id}
        progress={slot.progress}
        pointer={pointer}
        quality={quality}
        step={slot.step}
        element={slot.element}
        camera={slot.camera}
        layout={slot.layout}
      />
    </>,
    slot.scene,
  );
}
function Renderer({
  elements,
  onFailure,
}: {
  elements: HTMLElement[];
  onFailure: () => void;
}) {
  const { gl, invalidate, setDpr } = useThree();
  const [profile] = useState(deviceProfile);
  const budget = useMemo(
    () => createRenderBudget(profile.maxDpr, profile.minDpr),
    [profile],
  );
  const [mounted, setMounted] = useState<Slot[]>([]);
  const active = useRef<Slot[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const capture = useRef<((canvas: HTMLCanvasElement) => void) | null>(null);
  const last = useRef(0);
  const diagnostics = useRef({ frames: 0, elapsed: 0 });
  const measuring = useRef({ until: Infinity, width: 0, height: 0 });
  const bridge = useMemo(() => createTransitionField(), []);
  useEffect(() => () => bridge.dispose(), [bridge]);
  const slots = useMemo<Slot[]>(
    () =>
      elements.map((element) => ({
        element,
        container: element.parentElement,
        section:
          element.closest<HTMLElement>(".hero,.signal-journey") || element,
        id: element.dataset.scene as SceneId,
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(36, 1, 0.1, 100),
        progress: { current: 0 },
        step: { current: 0 },
        ready: false,
        layout: {
          rect: null,
          clip: null,
          section: null,
          viewportWidth: 0,
          viewportHeight: 0,
        },
      })),
    [elements],
  );
  const projects = useMemo(
    () => slots.filter((s) => s.element.classList.contains("project")),
    [slots],
  );

  useEffect(() => {
    setDpr(budget.dpr);
    const wake = () => {
      measuring.current.until = performance.now() + 1250;
      invalidate();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !active.current.length) return;
      pointer.current.x = (event.clientX / innerWidth) * 2 - 1;
      pointer.current.y = 1 - (event.clientY / innerHeight) * 2;
      invalidate();
    };
    const visibility = () => {
      last.current = 0;
      budget.reset();
      if (!document.hidden) wake();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      document.documentElement.dataset.graphicsFallback = "context-lost";
      onFailure();
    };
    const step = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; step: number }>)
        .detail;
      for (const s of slots)
        if (s.id === detail.id) s.step.current = detail.step;
      invalidate();
    };
    const request = (event: Event) => {
      capture.current = (
        event as CustomEvent<(canvas: HTMLCanvasElement) => void>
      ).detail;
      invalidate();
    };
    const ro = new ResizeObserver(wake);
    const observed = new Set<HTMLElement>();
    for (const s of slots) {
      observed.add(s.element);
      observed.add(s.section);
    }
    observed.forEach((element) => ro.observe(element));
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scene-step", step);
    window.addEventListener("project-frame", request);
    document.addEventListener("visibilitychange", visibility);
    gl.domElement.addEventListener("webglcontextlost", lost);
    wake();
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scene-step", step);
      window.removeEventListener("project-frame", request);
      document.removeEventListener("visibilitychange", visibility);
      gl.domElement.removeEventListener("webglcontextlost", lost);
      capture.current = null;
      slots.forEach((s) => delete s.element.dataset.ready);
    };
  }, [slots, gl, invalidate, onFailure, setDpr, budget]);

  // Read layout once before any scene writes. Stationary scenes need no scans.
  // Continue briefly after scrolling for GSAP's eased transforms to settle.
  useFrame(() => {
    if (document.hidden || performance.now() > measuring.current.until) return;
    const width = innerWidth,
      height = innerHeight;
    if (
      measuring.current.width !== width ||
      measuring.current.height !== height
    ) {
      measuring.current.width = width;
      measuring.current.height = height;
      const limits = deviceProfile();
      setDpr(budget.resize(limits.maxDpr, limits.minDpr));
    }
    const rects = new Map<HTMLElement, DOMRectReadOnly>();
    const read = (element: HTMLElement) => {
      if (!rects.has(element))
        rects.set(element, element.getBoundingClientRect());
      return rects.get(element)!;
    };
    const next: Slot[] = [];
    for (const s of slots) {
      const r = read(s.element);
      s.layout.rect = r;
      s.layout.clip = s.container ? read(s.container) : null;
      s.layout.section = read(s.section);
      s.layout.viewportWidth = width;
      s.layout.viewportHeight = height;
      s.progress.current = THREE.MathUtils.clamp(
        (height - r.top) / (height + r.height),
        0,
        1,
      );
      if (r.bottom > -650 && r.top < height + 650 && !loading.has(s.id))
        void preload(s.id).catch(() => {});
      if (r.bottom > 0 && r.top < height && r.width > 0 && next.length < 2)
        next.push(s);
      const aspect = r.width / Math.max(1, r.height);
      const distance =
        s.id === "hero"
          ? 9.2
          : s.id === "playground"
            ? 12
            : Math.max(10, 6.4 / (2 * Math.tan(Math.PI / 10) * aspect));
      if (s.camera.aspect !== aspect || s.camera.position.z !== distance) {
        s.camera.aspect = aspect;
        s.camera.position.set(0, 0, distance);
        s.camera.updateProjectionMatrix();
        s.camera.updateMatrixWorld();
      }
    }
    if (
      next.length !== active.current.length ||
      next.some((s, i) => s !== active.current[i])
    ) {
      active.current = next;
      setMounted(next);
      last.current = 0;
      budget.reset();
    }
  }, -100);

  useFrame(() => {
    if (document.hidden) return;
    const now = performance.now();
    if (active.current.length && last.current) {
      if (process.env.NODE_ENV === "development" && now - last.current < 250) {
        diagnostics.current.frames++;
        diagnostics.current.elapsed += now - last.current;
        if (diagnostics.current.frames >= 90) {
          gl.domElement.dataset.frameMs = (
            diagnostics.current.elapsed / diagnostics.current.frames
          ).toFixed(2);
          diagnostics.current.frames = diagnostics.current.elapsed = 0;
        }
      }
      const dpr = budget.sample(now - last.current);
      if (dpr !== null) setDpr(dpr);
    }
    last.current = active.current.length ? now : 0;
    gl.setScissorTest(false);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    gl.autoClear = false;
    const height = measuring.current.height;
    for (const s of active.current) {
      const r = s.layout.rect,
        clip = s.layout.clip;
      if (!s.ready || !r || r.width < 1 || r.height < 1) continue;
      const left = Math.max(0, r.left, clip?.left ?? 0),
        right = Math.min(innerWidth, r.right, clip?.right ?? innerWidth);
      const top = Math.max(0, r.top, clip?.top ?? 0),
        bottom = Math.min(height, r.bottom, clip?.bottom ?? height);
      if (right <= left || bottom <= top) continue;
      gl.setViewport(r.left, height - r.bottom, r.width, r.height);
      gl.setScissor(left, height - bottom, right - left, bottom - top);
      gl.setScissorTest(true);
      gl.clearDepth();
      try {
        gl.render(s.scene, s.camera);
        if (s.element.dataset.ready !== "true")
          s.element.dataset.ready = "true";
      } catch {
        document.documentElement.dataset.graphicsFallback = "render-error";
        delete s.element.dataset.ready;
        onFailure();
      }
    }
    gl.setScissorTest(false);
    if (innerWidth >= 768)
      for (let i = 0; i < projects.length - 1; i++) {
        const seam = projects[i + 1].layout.rect?.top;
        if (seam === undefined) continue;
        const t = 1 - (seam - height * 0.25) / (height * 0.5);
        if (t <= 0 || t >= 1) continue;
        bridge.update(
          projects[i].id,
          projects[i + 1].id,
          t,
          innerWidth / height,
        );
        gl.setViewport(0, 0, innerWidth, height);
        gl.clearDepth();
        gl.render(bridge.scene, bridge.camera);
      }
    gl.autoClear = true;
    if (capture.current) {
      const copy = capture.current;
      capture.current = null;
      copy(gl.domElement);
    }
    if (active.current.length || now < measuring.current.until) invalidate();
  }, 1);
  return (
    <>
      {mounted.map((s) => (
        <Suspense
          fallback={null}
          key={s.id + "-" + elements.indexOf(s.element)}
        >
          <WorldSlot
            slot={s}
            quality={profile.geometryQuality}
            pointer={pointer.current}
          />
        </Suspense>
      ))}
    </>
  );
}
export default function Graphics() {
  const path = usePathname();
  const [elements, setElements] = useState<HTMLElement[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setElements(
      Array.from(document.querySelectorAll<HTMLElement>("[data-scene]")),
    );
  }, [path]);
  const fail = useMemo(
    () => () => {
      setFailed(true);
      document
        .querySelectorAll("[data-ready]")
        .forEach((e) => e.removeAttribute("data-ready"));
    },
    [],
  );
  if (failed) return null;
  return (
    <Boundary>
      <div className="global-canvas" aria-hidden="true">
        <Canvas
          frameloop="demand"
          dpr={1}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0, 0);
          }}
          fallback={null}
        >
          <Renderer elements={elements} onFailure={fail} />
        </Canvas>
      </div>
    </Boundary>
  );
}
