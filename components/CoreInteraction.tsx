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
  const online = phase === "online";
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    distance: number;
  } | null>(null);
  // A still press that outlasts a tap charges the core for as long as it is
  // held; letting go early lets it wind back down. Mouse and pen only: on
  // touch a long press belongs to the browser.
  const hold = useRef<{
    timer: ReturnType<typeof setTimeout> | undefined;
    active: boolean;
  }>({ timer: undefined, active: false });
  const endHold = () => {
    clearTimeout(hold.current.timer);
    if (!hold.current.active) return false;
    hold.current.active = false;
    window.dispatchEvent(new Event("neural-release"));
    return true;
  };
  const turn = (x: number, y: number) =>
    window.dispatchEvent(new CustomEvent("core-turn", { detail: { x, y } }));
  return (
    <div
      className="hero-core-surface"
      data-cursor="drag"
      role="group"
      tabIndex={0}
      aria-label="Interactive reactor core"
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
        clearTimeout(hold.current.timer);
        if (e.pointerType !== "touch")
          hold.current.timer = setTimeout(() => {
            const d = drag.current;
            if (!d || d.distance >= 8 || getCoreState().phase !== "idle")
              return;
            hold.current.active = true;
            window.dispatchEvent(new Event("neural-hold"));
          }, 180);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x,
          dy = e.clientY - d.y;
        d.distance += Math.abs(dx) + Math.abs(dy);
        d.x = e.clientX;
        d.y = e.clientY;
        // A drag is a turn, not a hold.
        if (d.distance >= 8 && !hold.current.active)
          clearTimeout(hold.current.timer);
        turn(dx * 0.007, dy * 0.005);
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const held = endHold();
        if (!held && d.distance < 8)
          window.dispatchEvent(new Event("neural-signal"));
        drag.current = null;
        delete e.currentTarget.dataset.dragging;
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={(e) => {
        endHold();
        drag.current = null;
        delete e.currentTarget.dataset.dragging;
      }}
      onLostPointerCapture={(e) => {
        endHold();
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
        {online
          ? "DRAG TO TURN ↔ CLICK TO POWER DOWN"
          : "DRAG TO TURN ↔ CLICK OR HOLD TO ENERGISE"}
      </span>
      <span id="core-help" className="sr-only">
        {online
          ? "Drag or use arrow keys to turn the reactor. Press Enter or Space to power it down."
          : "Drag or swipe horizontally to turn the reactor. Use arrow keys to rotate. Press Enter or Space to energise it, or press and hold with a mouse to charge it by hand. Vertical swipes scroll the page."}
      </span>
    </div>
  );
}
