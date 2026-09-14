"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Artwork, { type ProjectSceneId } from "./Artwork";
import { sendPlaygroundInput } from "@/lib/playground-input";

export type PlaygroundProject = {
  slug: ProjectSceneId;
  title: string;
  category: string;
  summary: string;
  number: string;
};
type Gesture = {
  pointerId: number;
  index: number;
  button: HTMLButtonElement;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  time: number;
  vx: number;
  vy: number;
  moved: boolean;
};

export default function ProjectPlayground({
  projects,
}: {
  projects: PlaygroundProject[];
}) {
  const stage = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const current = selected === null ? null : projects[selected];

  useEffect(() => {
    const surface = stage.current;
    const cancel = () => {
      const g = gesture.current;
      gesture.current = null;
      if (g?.button.hasPointerCapture(g.pointerId))
        g.button.releasePointerCapture(g.pointerId);
      delete surface?.dataset.dragging;
      sendPlaygroundInput(surface, { kind: "cancel" });
    };
    const observe = new MutationObserver(() => {
      if (surface?.dataset.ready !== "true") cancel();
    });
    if (surface)
      observe.observe(surface, {
        attributes: true,
        attributeFilter: ["data-ready"],
      });
    const visibility = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    document.addEventListener("visibilitychange", visibility);
    surface?.addEventListener("playground-reset-gesture", cancel);
    return () => {
      cancel();
      observe.disconnect();
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
      document.removeEventListener("visibilitychange", visibility);
      surface?.removeEventListener("playground-reset-gesture", cancel);
    };
  }, []);

  function choose(index: number) {
    setSelected(index);
    if (stage.current) stage.current.dataset.selected = String(index);
    sendPlaygroundInput(stage.current, { kind: "select", index });
    setAnnouncement(`${projects[index].title}. ${projects[index].summary}`);
  }
  function point(x: number, y: number) {
    const r = stage.current!.getBoundingClientRect();
    return { x: (x - r.left) / r.width - 0.5, y: 0.5 - (y - r.top) / r.height };
  }
  function down(event: ReactPointerEvent<HTMLButtonElement>, index: number) {
    suppressClick.current = false;
    // Touch uses native taps; pan-y and pinch zoom remain browser-owned.
    if (
      event.pointerType === "touch" ||
      event.button !== 0 ||
      !event.isPrimary ||
      stage.current?.dataset.ready !== "true"
    )
      return;
    gesture.current = {
      pointerId: event.pointerId,
      index,
      button: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      time: event.timeStamp,
      vx: 0,
      vy: 0,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: ReactPointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    if (
      !g.moved &&
      Math.hypot(event.clientX - g.startX, event.clientY - g.startY) < 6
    )
      return;
    if (!g.moved) {
      g.moved = true;
      if (stage.current) stage.current.dataset.dragging = "true";
      sendPlaygroundInput(stage.current, {
        kind: "grab",
        index: g.index,
        ...point(g.startX, g.startY),
      });
    }
    const now = event.timeStamp,
      dt = Math.max(0.008, (now - g.time) / 1000);
    const r = stage.current!.getBoundingClientRect();
    g.vx = g.vx * 0.3 + ((event.clientX - g.lastX) / r.width / dt) * 0.7;
    g.vy = g.vy * 0.3 - ((event.clientY - g.lastY) / r.height / dt) * 0.7;
    g.lastX = event.clientX;
    g.lastY = event.clientY;
    g.time = now;
    sendPlaygroundInput(stage.current, {
      kind: "move",
      index: g.index,
      ...point(event.clientX, event.clientY),
    });
  }
  function finish(
    event: ReactPointerEvent<HTMLButtonElement>,
    cancelled = false,
  ) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    gesture.current = null;
    suppressClick.current = g.moved;
    const stale = event.timeStamp - g.time > 100;
    sendPlaygroundInput(stage.current, {
      kind: "release",
      vx: cancelled || stale ? 0 : g.vx,
      vy: cancelled || stale ? 0 : g.vy,
    });
    if (g.button.hasPointerCapture(g.pointerId))
      g.button.releasePointerCapture(g.pointerId);
    delete stage.current?.dataset.dragging;
  }
  function assemble() {
    stage.current?.dispatchEvent(new Event("playground-reset-gesture"));
    setSelected(null);
    if (stage.current) stage.current.dataset.selected = "-1";
    sendPlaygroundInput(stage.current, { kind: "assemble" });
    setAnnouncement(
      "The five objects are returning to their starting positions.",
    );
  }

  return (
    <section
      className="playground"
      id="playground"
      aria-labelledby="playground-title"
    >
      <header className="playground-header">
        <div>
          <span className="eyebrow">05 / THE PLAYGROUND</span>
          <h2 id="playground-title">
            Go on.
            <br />
            <em>Move things.</em>
          </h2>
        </div>
        <p>
          Five projects. A little room to play.
          <br />
          Find the one that pulls you in.
        </p>
      </header>
      <div className="playground-layout">
        <div className="playground-stage" data-scene="playground" ref={stage}>
          <div className="playground-coordinates" aria-hidden="true">
            <span>FIELD / 05</span>
            <span>SHUBHANG VARDA</span>
          </div>
          <div className="playground-fallback">
            {projects.map((project) => (
              <Link
                href={`/work/${project.slug}`}
                key={project.slug}
                className="playground-poster"
                data-project-zoom
                data-project-title={project.title}
              >
                <Artwork scene={project.slug} />
                <span>
                  {project.number} / {project.title} <b aria-hidden="true">↗</b>
                </span>
              </Link>
            ))}
          </div>
          <div
            className="playground-objects"
            role="group"
            aria-label="Interactive project sculptures"
          >
            {projects.map((project, index) => (
              <button
                key={project.slug}
                type="button"
                className="playground-object"
                data-body={index}
                aria-label={`Select ${project.title}`}
                aria-pressed={selected === index}
                aria-describedby="playground-help"
                aria-controls="playground-detail"
                onPointerDown={(event) => down(event, index)}
                onPointerMove={move}
                onPointerUp={(event) => finish(event)}
                onPointerCancel={(event) => finish(event, true)}
                onLostPointerCapture={(event) => finish(event, true)}
                onPointerEnter={() =>
                  sendPlaygroundInput(stage.current, { kind: "hover", index })
                }
                onPointerLeave={() =>
                  sendPlaygroundInput(stage.current, {
                    kind: "hover",
                    index: -1,
                  })
                }
                onFocus={() =>
                  sendPlaygroundInput(stage.current, { kind: "hover", index })
                }
                onBlur={() =>
                  sendPlaygroundInput(stage.current, {
                    kind: "hover",
                    index: -1,
                  })
                }
                onClick={(event) => {
                  if (suppressClick.current && event.detail !== 0) {
                    suppressClick.current = false;
                    return;
                  }
                  choose(index);
                }}
                onKeyDown={(event) => {
                  const directions: Record<string, [number, number]> = {
                    ArrowLeft: [-1, 0],
                    ArrowRight: [1, 0],
                    ArrowUp: [0, 1],
                    ArrowDown: [0, -1],
                  };
                  if (directions[event.key]) {
                    event.preventDefault();
                    const [x, y] = directions[event.key];
                    sendPlaygroundInput(stage.current, {
                      kind: "nudge",
                      index,
                      x,
                      y,
                    });
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    assemble();
                  }
                }}
              >
                <span className="playground-object-label">
                  <small>{project.number}</small>
                  {project.title}
                </span>
              </button>
            ))}
          </div>
          <div className="playground-stage-footer">
            <span className="playground-instruction">
              <span className="playground-desktop-hint">
                Drag to play · Select to discover
              </span>
              <span className="playground-touch-hint">
                Tap an object to discover
              </span>
            </span>
            <button
              type="button"
              className="playground-assemble"
              onClick={assemble}
            >
              <span aria-hidden="true">↺</span> Assemble
            </button>
          </div>
        </div>
        <aside className="playground-sidebar" aria-label="Discover a project">
          <div id="playground-detail" className="playground-detail">
            <span className="eyebrow">
              {current
                ? `${current.number} / ${current.category}`
                : "PICK SOMETHING UP"}
            </span>
            <h3>
              {current ? (
                current.title
              ) : (
                <>
                  Different shapes.
                  <br />
                  The same curiosity.
                </>
              )}
            </h3>
            <p>
              {current
                ? current.summary
                : "Every object has a story. Select one to see what it does, how it works, and what went into building it."}
            </p>
            {current ? (
              <Link
                className="playground-explore"
                href={`/work/${current.slug}`}
                data-playground-project={current.title}
              >
                Explore project <span aria-hidden="true">↗</span>
              </Link>
            ) : (
              <span className="playground-awaiting">
                Choose an object or a project below.
              </span>
            )}
          </div>
          <div
            className="playground-picker"
            role="group"
            aria-label="Select a project"
          >
            {projects.map((project, index) => (
              <button
                type="button"
                key={project.slug}
                aria-pressed={selected === index}
                aria-controls="playground-detail"
                onClick={() => choose(index)}
              >
                <span>{project.number}</span>
                {project.title}
                <b aria-hidden="true">{selected === index ? "−" : "+"}</b>
              </button>
            ))}
          </div>
        </aside>
      </div>
      <div className="playground-footnote">
        <p>Original objects. Real projects.</p>
        <a href="#contact">Have something in mind? Let’s talk ↗</a>
      </div>
      <p id="playground-help" className="sr-only">
        Select an object with Enter or Space, then use Explore project. Arrow
        keys push the focused object. Escape assembles all objects. On touch
        screens, tap to select.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
