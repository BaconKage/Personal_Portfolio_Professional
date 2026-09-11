"use client";
import { useRef } from "react";

export default function CoreInteraction() {
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
      aria-label="Interactive AI core"
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
        DRAG TO TURN <b>↔</b> CLICK TO CHARGE
      </span>
      <span id="core-help" className="sr-only">
        Drag or swipe horizontally to turn the sculpture. With keyboard focus,
        use arrow keys to rotate and Enter to send a charge. Vertical swipes
        scroll the page.
      </span>
    </div>
  );
}
