"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const labels: Record<string, string> = {
  view: "View ↗",
  drag: "Drag",
  open: "Open ↗",
};

/**
 * The system cursor stays; the trail lives in WebGL (ScreenPaint). Over
 * elements marked `data-cursor`, a small label follows the pointer.
 */
export default function Cursor() {
  const label = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return;
    const el = label.current!;
    const text = el.querySelector("span")!;
    gsap.set(el, { xPercent: -50, yPercent: -50 });
    const x = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" }),
      y = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });
    let mode = "",
      placed = false;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      // Sit just below-right of the pointer so the arrow stays visible.
      const tx = event.clientX + 34,
        ty = event.clientY + 30;
      if (!placed) {
        placed = true;
        gsap.set(el, { x: tx, y: ty });
      }
      x(tx);
      y(ty);
    };
    const over = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const next =
        target?.closest<HTMLElement>("[data-cursor]")?.dataset.cursor || "";
      if (next === mode) return;
      mode = next;
      if (labels[next]) {
        text.textContent = labels[next];
        el.dataset.visible = "true";
      } else delete el.dataset.visible;
    };
    const hide = () => {
      placed = false;
      mode = "";
      delete el.dataset.visible;
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
    return () => {
      hide();
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
      x.tween.kill();
      y.tween.kill();
    };
  }, []);
  return (
    <div ref={label} className="cursor-label" aria-hidden="true">
      <span />
    </div>
  );
}
