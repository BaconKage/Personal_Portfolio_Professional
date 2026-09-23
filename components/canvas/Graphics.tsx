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
import { gsap } from "gsap";
import type { SceneId } from "@/components/Artwork";
import type { SceneLayout, SceneProps } from "./types";
import { createRenderBudget, getRenderProfile } from "@/lib/render-budget";
import { createTransitionField } from "./TransitionField";
import { createScreenPaint } from "./ScreenPaint";
import { createProjectSheet, type ProjectSheet } from "./ProjectSheet";
import { projectZoom } from "@/lib/zoom";

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
/** Shortest time a project sheet takes to unfurl, however fast the scroll. */
const LANDING_SECONDS = 1.4;
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
  active: { current: boolean };
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
    document.querySelectorAll("[data-ready],[data-sheet]").forEach((e) => {
      e.removeAttribute("data-ready");
      e.removeAttribute("data-sheet");
    });
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function WorldSlot({
  slot,
  quality,
  pointer,
  onReady,
}: {
  slot: Slot;
  quality: number;
  pointer: { x: number; y: number };
  onReady: () => void;
}) {
  const World = worlds[slot.id];
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Programs compile in parallel before first use, so scrolling a world
    // into view never stalls a frame. The poster covers the wait. This is
    // compileAsync's polling, made safe for worlds disposed mid-compile.
    const pending = gl.compile(slot.scene, slot.camera);
    const poll = () => {
      if (cancelled) return;
      for (const material of pending) {
        const program = (
          gl.properties.get(material) as {
            currentProgram?: { isReady(): boolean };
          }
        ).currentProgram;
        if (!program || program.isReady()) pending.delete(material);
      }
      if (pending.size) {
        timer = setTimeout(poll, 16);
        return;
      }
      slot.ready = true;
      onReady();
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      slot.ready = false;
      delete slot.element.dataset.ready;
    };
  }, [slot, gl, onReady]);
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
        active={slot.active}
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
  const { gl, advance, setDpr } = useThree();
  const [profile] = useState(deviceProfile);
  const budget = useMemo(
    () => createRenderBudget(profile.maxDpr, profile.minDpr),
    [profile],
  );
  const [mounted, setMounted] = useState<Slot[]>([]);
  const mountedSlots = useRef(new Set<Slot>());
  const active = useRef<Slot[]>([]);
  const pointer = useRef({ x: 0, y: 0 });
  const capture = useRef<((canvas: HTMLCanvasElement) => void) | null>(null);
  const last = useRef(0);
  const dirty = useRef(true);
  const diagnostics = useRef({ frames: 0, elapsed: 0 });
  const measuring = useRef({ until: Infinity, height: 0 });
  const bridge = useMemo(() => createTransitionField(), []);
  useEffect(() => () => bridge.dispose(), [bridge]);
  // The cursor paints a fading velocity trail that distorts the frame.
  // Mouse-only, and only where half-float render targets are available.
  const paint = useMemo(() => {
    if (!matchMedia("(pointer: fine)").matches) return null;
    if (
      !gl.capabilities.isWebGL2 ||
      !gl.extensions.has("EXT_color_buffer_float")
    )
      return null;
    return createScreenPaint(gl);
  }, [gl]);
  useEffect(() => () => paint?.dispose(), [paint]);
  const brush = useRef({
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    moved: false,
    until: 0,
    last: 0,
  });
  const requestRender = useMemo(
    () => () => {
      dirty.current = true;
    },
    [],
  );
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
        active: { current: false },
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
    mountedSlots.current = new Set();
    active.current = [];
    setMounted([]);
  }, [slots]);
  // Home project cards land as bending sheets (needs WebGL2 MSAA targets).
  const sheets = useRef(new Map<Slot, ProjectSheet>());
  // Each sheet's displayed landing progress, smoothed in time (see below).
  const landing = useRef(
    new Map<
      Slot,
      {
        shown: number;
        seen: number;
        frame: number;
        hover: number;
        hx: number;
        hy: number;
      }
    >(),
  );
  // Counts rendered frames: a sheet skipped for a frame has left the view.
  const frameCount = useRef(0);
  // Mouse position for card hover (client px); x < 0 when off the page.
  const hoverPointer = useRef({ x: -1, y: -1 });
  const sheetFor = (s: Slot) => {
    if (!gl.capabilities.isWebGL2 || !s.element.classList.contains("project"))
      return null;
    let sheet = sheets.current.get(s);
    if (!sheet) {
      sheet = createProjectSheet(gl, s.id);
      sheets.current.set(s, sheet);
    }
    return sheet;
  };
  useEffect(
    () => () => {
      sheets.current.forEach((sheet) => sheet.dispose());
      sheets.current.clear();
      landing.current.clear();
    },
    [slots],
  );
  // Tells the choreography that card copy should wait for sheets to land.
  useEffect(() => {
    if (!gl.capabilities.isWebGL2) return;
    document.documentElement.dataset.sheets = "on";
    return () => {
      delete document.documentElement.dataset.sheets;
    };
  }, [gl]);

  // One clock: Lenis scrolls, GSAP choreographs, then this renders, all in
  // the same gsap.ticker frame. Idle frames skip WebGL work entirely.
  useEffect(() => {
    let time = 0;
    const tick = (_: number, deltaMs: number) => {
      if (document.hidden) return;
      const now = performance.now();
      if (
        !dirty.current &&
        !active.current.length &&
        now > measuring.current.until &&
        now > brush.current.until
      )
        return;
      dirty.current = false;
      // Clamped virtual time keeps world animation continuous after idle gaps.
      time += Math.min(Math.max(deltaMs, 0) / 1000, 1 / 20);
      advance(time);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [advance]);

  useEffect(() => {
    setDpr(budget.dpr);
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const wake = () => {
      measuring.current.until = performance.now() + 1250;
      requestRender();
    };
    // Reallocating the drawing buffer is expensive: let resizes settle first.
    const resize = () => {
      wake();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const limits = deviceProfile();
        setDpr(budget.resize(limits.maxDpr, limits.minDpr));
        wake();
      }, 200);
    };
    const leavePage = () => {
      hoverPointer.current.x = hoverPointer.current.y = -1;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        hoverPointer.current.x = event.clientX;
        hoverPointer.current.y = event.clientY;
      }
      if (paint && event.pointerType === "mouse") {
        const b = brush.current;
        b.x = event.clientX;
        b.y = event.clientY;
        b.moved = true;
        // Long enough for the slowest channel to fully dissipate.
        b.until = performance.now() + 3500;
        requestRender();
      }
      if (event.pointerType === "touch" || !active.current.length) return;
      pointer.current.x = (event.clientX / innerWidth) * 2 - 1;
      pointer.current.y = 1 - (event.clientY / innerHeight) * 2;
      requestRender();
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
      requestRender();
    };
    const request = (event: Event) => {
      capture.current = (
        event as CustomEvent<(canvas: HTMLCanvasElement) => void>
      ).detail;
      requestRender();
    };
    const ro = new ResizeObserver(wake);
    const observed = new Set<HTMLElement>();
    for (const s of slots) {
      observed.add(s.element);
      observed.add(s.section);
    }
    observed.forEach((element) => ro.observe(element));
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leavePage);
    window.addEventListener("scene-step", step);
    window.addEventListener("project-frame", request);
    // Transforms (e.g. the project zoom) move scenes without scroll events.
    window.addEventListener("scene-measure", wake);
    document.addEventListener("visibilitychange", visibility);
    gl.domElement.addEventListener("webglcontextlost", lost);
    wake();
    return () => {
      clearTimeout(resizeTimer);
      ro.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leavePage);
      window.removeEventListener("scene-step", step);
      window.removeEventListener("project-frame", request);
      window.removeEventListener("scene-measure", wake);
      document.removeEventListener("visibilitychange", visibility);
      gl.domElement.removeEventListener("webglcontextlost", lost);
      capture.current = null;
      slots.forEach((s) => {
        s.active.current = false;
        delete s.element.dataset.ready;
        delete s.element.dataset.sheet;
        delete s.element.dataset.landed;
      });
    };
  }, [slots, gl, requestRender, onFailure, setDpr, budget, paint]);

  // Read layout once, after Lenis and GSAP have written this frame's scroll
  // and transforms, so each scene lands exactly where its DOM box is painted.
  // Stationary scenes need no scans; GSAP's eased scrubs settle within 1.25s.
  useFrame(() => {
    if (document.hidden || performance.now() > measuring.current.until) return;
    const width = innerWidth,
      height = innerHeight;
    measuring.current.height = height;
    const rects = new Map<HTMLElement, DOMRectReadOnly>();
    const read = (element: HTMLElement) => {
      if (!rects.has(element))
        rects.set(element, element.getBoundingClientRect());
      return rects.get(element)!;
    };
    const next: Slot[] = [];
    let arrived = false;
    const margin = height * 1.25;
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
      // Worlds near the viewport load and compile ahead of time, then stay
      // mounted, so revisiting a section never rebuilds or recompiles it.
      if (r.bottom > -margin && r.top < height + margin && r.width > 0) {
        if (!loading.has(s.id)) void preload(s.id).catch(() => {});
        if (!mountedSlots.current.has(s)) {
          mountedSlots.current.add(s);
          arrived = true;
        }
      }
      if (r.bottom > 0 && r.top < height && r.width > 0 && next.length < 2)
        next.push(s);
      const aspect = r.width / Math.max(1, r.height);
      const distance =
        s.id === "hero"
          ? 9.2
          : s.id === "playground"
            ? 12
            : Math.max(10, 6.4 / (2 * Math.tan(Math.PI / 10) * aspect));
      // The card being zoomed into pushes its own camera in: a dive into
      // the world while the page zooms around it.
      const dive =
        projectZoom.element === s.element ? projectZoom.amount ** 2 * 0.6 : 0;
      if (
        s.camera.aspect !== aspect ||
        s.camera.position.z !== distance ||
        s.camera.zoom !== 1 + dive
      ) {
        s.camera.aspect = aspect;
        s.camera.zoom = 1 + dive;
        s.camera.position.set(0, 0, distance);
        s.camera.updateProjectionMatrix();
        s.camera.updateMatrixWorld();
      }
    }
    if (arrived) setMounted(Array.from(mountedSlots.current));
    if (
      next.length !== active.current.length ||
      next.some((s, i) => s !== active.current[i])
    ) {
      for (const s of active.current) s.active.current = false;
      for (const s of next) s.active.current = true;
      active.current = next;
      last.current = 0;
      budget.reset();
    }
  }, -100);

  useFrame((state) => {
    if (document.hidden) return;
    const now = performance.now();
    const frame = ++frameCount.current;
    const painting = !!paint && now < brush.current.until;
    if (painting) {
      const b = brush.current;
      paint.resize(state.size.width, state.size.height);
      if (!b.last) {
        // Resuming after idle: start the stroke where the pointer is now.
        paint.reset();
        b.px = b.x;
        b.py = b.y;
      }
      const dt = b.last ? Math.min((now - b.last) / 1000, 1 / 20) : 1 / 60;
      b.last = now;
      paint.update(dt, b, { x: b.px, y: b.py }, b.moved);
      b.px = b.x;
      b.py = b.y;
      b.moved = false;
    } else brush.current.last = 0;
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
    const height = measuring.current.height || innerHeight;
    for (const s of active.current) {
      const r = s.layout.rect,
        clip = s.layout.clip;
      if (!s.ready || !r || r.width < 1 || r.height < 1) continue;
      const sheet = sheetFor(s);
      if (sheet) {
        // Scroll sets the target: 0 as the card's top enters, 1 once its top
        // is 15% down the screen. The sheet follows it smoothly but never
        // lands faster than LANDING_SECONDS, so a fast scroll still plays it.
        const target = THREE.MathUtils.clamp(
          (height - r.top) / (height * 0.85),
          0,
          1,
        );
        let land = landing.current.get(s);
        // Re-entry is judged by skipped frames, not elapsed time, so a long
        // frame (GC, hidden tab) never resets a card that stayed in view.
        if (!land || land.frame !== frame - 1) {
          // (Re)entering view from below or by a jump: unfurl from the start.
          // Scrolling back up into a card from beneath it: already landed.
          // A world that only just finished loading while its card is on
          // screen takes over from the poster in place, with no flash.
          const takeover = s.element.dataset.sheet !== "true" && target > 0.25;
          land = {
            shown: r.top > 0 && !takeover ? 0 : target,
            seen: now,
            frame,
            hover: 0,
            hx: 0.5,
            hy: 0.5,
          };
          landing.current.set(s, land);
        }
        const dt = Math.min((now - land.seen) / 1000, 0.05);
        land.seen = now;
        land.frame = frame;
        const diff = target - land.shown;
        land.shown +=
          Math.sign(diff) *
          Math.min(
            Math.abs(diff) * (1 - Math.exp(-dt * 6)),
            dt / LANDING_SECONDS,
          );
        const ratio = land.shown;
        if (ratio > 0.9 && s.element.dataset.landed !== "true")
          s.element.dataset.landed = "true";
        else if (ratio < 0.55 && s.element.dataset.landed)
          delete s.element.dataset.landed;
        // Hover (landed cards only, never mid-zoom): the image leans toward
        // the cursor and the world camera slides with it for real parallax.
        const hp = hoverPointer.current;
        const over =
          ratio > 0.95 &&
          !projectZoom.element &&
          hp.x >= r.left &&
          hp.x <= r.right &&
          hp.y >= r.top &&
          hp.y <= r.bottom;
        land.hover = THREE.MathUtils.damp(land.hover, over ? 1 : 0, 5, dt);
        land.hx = THREE.MathUtils.damp(
          land.hx,
          over ? (hp.x - r.left) / r.width : 0.5,
          6,
          dt,
        );
        land.hy = THREE.MathUtils.damp(
          land.hy,
          over ? (hp.y - r.top) / r.height : 0.5,
          6,
          dt,
        );
        s.camera.position.x = (land.hx - 0.5) * 1.2 * land.hover;
        s.camera.position.y = -(land.hy - 0.5) * 0.8 * land.hover;
        s.camera.lookAt(0, 0, 0);
        s.camera.updateMatrixWorld();
        if (ratio < 0.004) continue;
        const width = state.size.width;
        const cl = Math.max(0, clip?.left ?? 0),
          cr = Math.min(width, clip?.right ?? width),
          ct = Math.max(0, clip?.top ?? 0),
          cb = Math.min(height, clip?.bottom ?? height);
        if (cr <= cl || cb <= ct) continue;
        gl.setViewport(0, 0, width, height);
        gl.setScissor(cl, height - cb, cr - cl, cb - ct);
        gl.setScissorTest(true);
        try {
          sheet.render(
            s.scene,
            s.camera,
            r,
            ratio,
            width,
            height,
            { width: s.element.offsetWidth, height: s.element.offsetHeight },
            { amount: land.hover, x: land.hx, y: land.hy },
          );
          if (s.element.dataset.ready !== "true") {
            // The sheet now paints the card; the DOM card steps aside.
            s.element.dataset.sheetBg = getComputedStyle(s.element).background;
            s.element.dataset.sheet = "true";
            s.element.dataset.ready = "true";
          }
        } catch {
          document.documentElement.dataset.graphicsFallback = "render-error";
          delete s.element.dataset.ready;
          delete s.element.dataset.sheet;
          onFailure();
        }
        continue;
      }
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
    if (painting) paint.composite(state.size.width, state.size.height);
    gl.autoClear = true;
    if (capture.current) {
      const copy = capture.current;
      capture.current = null;
      copy(gl.domElement);
    }
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
            onReady={requestRender}
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
      document.querySelectorAll("[data-ready],[data-sheet]").forEach((e) => {
        e.removeAttribute("data-ready");
        e.removeAttribute("data-sheet");
        e.removeAttribute("data-landed");
      });
    },
    [],
  );
  if (failed) return null;
  return (
    <Boundary>
      <div className="global-canvas" aria-hidden="true">
        <Canvas
          frameloop="never"
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
