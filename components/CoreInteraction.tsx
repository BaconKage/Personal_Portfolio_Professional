"use client";
import { useRef, useSyncExternalStore } from "react";
import {
  getCoreState,
  getServerCoreState,
  subscribeCore,
} from "@/lib/core-sequence";

export default function CoreInteraction() {
  const { phase } = useSyncExternalStore(
    subscribeCore,
    getCoreState,
    getServerCoreState,
  );
  const starry = phase === "stars";
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    distance: number;
  } | null>(null);
  const turn = (x: number, y: number) =>
    window.dispatchEvent(new CustomEvent("core-turn", { detail: { x, y } }));
  return (
    <div
      className="hero-core-surface"
      role="group"
      tabIndex={0}
      aria-label={starry ? "Interactive star field" : "Interactive AI core"}
      aria-describedby="core-help"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        drag.current = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          distance: 0,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.dataset.dragging = "true";
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x,
          dy = e.clientY - d.y;
        d.distance += Math.abs(dx) + Math.abs(dy);
        d.x = e.clientX;
        d.y = e.clientY;
        turn(dx * 0.007, dy * 0.005);
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        if (d.distance < 8) window.dispatchEvent(new Event("neural-signal"));
        drag.current = null;
        delete e.currentTarget.dataset.dragging;
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={(e) => {
        drag.current = null;
        delete e.currentTarget.dataset.dragging;
      }}
      onLostPointerCapture={(e) => {
        drag.current = null;
        delete e.currentTarget.dataset.dragging;
      }}
      onKeyDown={(e) => {
        if (
          [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Enter",
            " ",
          ].includes(e.key)
        )
          e.preventDefault();
        if (e.key === "ArrowLeft") turn(-0.3, 0);
        if (e.key === "ArrowRight") turn(0.3, 0);
        if (e.key === "ArrowUp") turn(0, -0.2);
        if (e.key === "ArrowDown") turn(0, 0.2);
        if (e.key === "Enter" || e.key === " ")
          window.dispatchEvent(new Event("neural-signal"));
      }}
    >
      <span className="core-hint" aria-hidden="true">
        {starry
          ? "CLICK TO REFORM THE CORE ↻"
          : "DRAG TO TURN ↔ CLICK TO ENERGISE"}
      </span>
      <span id="core-help" className="sr-only">
        {starry
          ? "Press Enter or Space to bring the core back from the star field."
          : "Drag or swipe horizontally to turn the sculpture. Use arrow keys to rotate. Press Enter or Space to energise it and release the stars. Vertical swipes scroll the page."}
      </span>
    </div>
  );
}
