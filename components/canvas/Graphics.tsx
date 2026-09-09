"use client";
/* Three.js owns mutable scene objects outside React's UI state. Effects here bind
   browser geometry to the renderer; React Compiler mutation rules do not apply. */
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
import type { SceneProps } from "./types";
import { createTransitionField } from "./TransitionField";
const worlds: Record<
  SceneId,
  React.LazyExoticComponent<React.ComponentType<SceneProps>>
> = {
  hero: lazy(() => import("./HeroWorld")),
  mygym: lazy(() => import("./MyGymWorld")),
  vanicert: lazy(() => import("./VoiceWorld")),
  "firstdrop-ai": lazy(() => import("./ConversationWorld")),
  bhashabuddy: lazy(() => import("./LanguageWorld")),
  "posture-engine": lazy(() => import("./PostureWorld")),
};
type Slot = {
  element: HTMLElement;
  id: SceneId;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  progress: { current: number };
  step: { current: number };
  ready: boolean;
};
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
  const [quality, setQuality] = useState(1);
  const [visible, setVisible] = useState<HTMLElement[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const capture = useRef<((canvas: HTMLCanvasElement) => void) | null>(null);
  useEffect(() => {
    const request = (event: Event) => {
      capture.current = (event as CustomEvent<(canvas: HTMLCanvasElement) => void>).detail;
      invalidate();
    };
    window.addEventListener("project-frame", request);
    return () => { window.removeEventListener("project-frame", request); capture.current = null; };
  }, [invalidate]);
  const slow = useRef(0);
  const last = useRef(0);
  const bridge = useMemo(() => createTransitionField(), []);
  useEffect(() => () => bridge.dispose(), [bridge]);
  const slots = useMemo(
    () =>
      elements.map((element) => ({
        element,
        id: element.dataset.scene as SceneId,
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(36, 1, 0.1, 100),
        progress: { current: 0 },
        step: { current: 0 },
        ready: false,
      })),
    [elements],
  );
  useEffect(() => {
    const coarse = matchMedia("(pointer: coarse)").matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const low =
      coarse ||
      (nav.hardwareConcurrency || 8) <= 4 ||
      (nav.deviceMemory || 8) <= 4;
    setDpr(Math.min(devicePixelRatio, low ? 1.25 : 1.75));
    setQuality(low ? 0.55 : 1);
    function wake() {
      invalidate();
    }
    function update() {
      const next: HTMLElement[] = [];
      slots.forEach((s) => {
        const r = s.element.getBoundingClientRect();
        s.progress.current = THREE.MathUtils.clamp(
          (innerHeight - r.top) / (innerHeight + r.height),
          0,
          1,
        );
        if (r.bottom > 0 && r.top < innerHeight && r.width > 0)
          next.push(s.element);
      });
      setVisible((current) =>
        current.length === next.length && current.every((v, i) => v === next[i])
          ? current
          : next,
      );
      wake();
    }
    function move(e: PointerEvent) {
      if (coarse) return;
      pointer.current.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / innerHeight) * 2 - 1);
      wake();
    }
    function visibility() {
      last.current = 0;
      if (!document.hidden) update();
    }
    function lost(e: Event) {
      e.preventDefault();
      document.documentElement.dataset.graphicsFallback = "context-lost";
      onFailure();
    }
    function step(e: Event) {
      const detail = (e as CustomEvent<{ id: string; step: number }>).detail;
      slots
        .filter((s) => s.id === detail.id)
        .forEach((s) => {
          s.step.current = detail.step;
        });
      wake();
    }
    const ro = new ResizeObserver(update);
    slots.forEach((s) => ro.observe(s.element));
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scene-step", step);
    document.addEventListener("visibilitychange", visibility);
    gl.domElement.addEventListener("webglcontextlost", lost);
    update();
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scene-step", step);
      document.removeEventListener("visibilitychange", visibility);
      gl.domElement.removeEventListener("webglcontextlost", lost);
      slots.forEach((s) => delete s.element.dataset.ready);
    };
  }, [slots, gl, invalidate, onFailure, setDpr]);
  useFrame(() => {
    if (document.hidden) return;
    const now = performance.now();
    const dt = now - last.current;
    last.current = now;
    if (dt > 40 && dt < 200) slow.current++;
    else slow.current = Math.max(0, slow.current - 1);
    if (slow.current > 70) {
      setDpr(1);
      setQuality(0.25);
      slow.current = 0;
    }
    gl.setScissorTest(false);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    const height = gl.domElement.clientHeight;
    for (const s of slots) {
      if (!s.ready || !visible.includes(s.element)) continue;
      const r = s.element.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const clip = s.element.parentElement?.getBoundingClientRect();
      const left = Math.max(0, r.left, clip?.left ?? 0),
        right = Math.min(innerWidth, r.right, clip?.right ?? innerWidth),
        top = Math.max(0, r.top, clip?.top ?? 0),
        bottom = Math.min(height, r.bottom, clip?.bottom ?? height);
      s.camera.aspect = r.width / r.height;
      const distance =
        s.id === "hero"
          ? 9.2
          : Math.max(10, 6.4 / (2 * Math.tan(Math.PI / 10) * s.camera.aspect));
      s.camera.position.set(0, 0, distance);
      s.camera.updateProjectionMatrix();
      gl.setViewport(r.left, height - r.bottom, r.width, r.height);
      gl.setScissor(
        left,
        height - bottom,
        Math.max(0, right - left),
        Math.max(0, bottom - top),
      );
      gl.setScissorTest(true);
      try {
        gl.render(s.scene, s.camera);
        s.element.dataset.ready = "true";
      } catch {
        document.documentElement.dataset.graphicsFallback = "render-error";
        delete s.element.dataset.ready;
        onFailure();
      }
    }
    gl.setScissorTest(false);
    if (innerWidth >= 768 && quality > 0.5) {
      const projects = slots.filter((s) =>
        s.element.classList.contains("project"),
      );
      for (let i = 0; i < projects.length - 1; i++) {
        const seam = projects[i + 1].element.getBoundingClientRect().top;
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
        gl.autoClear = false;
        gl.render(bridge.scene, bridge.camera);
        gl.autoClear = true;
      }
    }
    // Copy in the rendering frame, before WebGL discards its drawing buffer.
    if (capture.current) {
      const copy = capture.current;
      capture.current = null;
      copy(gl.domElement);
    }
    if (visible.length) invalidate();
  }, 1);
  return (
    <>
      {slots
        .filter((s) => visible.includes(s.element))
        .slice(0, 2)
        .map((s) => (
          <Suspense
            fallback={null}
            key={`${s.id}-${elements.indexOf(s.element)}`}
          >
            <WorldSlot slot={s} quality={quality} pointer={pointer.current} />
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
          gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
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
