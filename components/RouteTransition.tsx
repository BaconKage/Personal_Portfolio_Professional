"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";

export default function RouteTransition({ reduced }: { reduced: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!panel.current || !pending.current) return;
    pending.current = false;
    if (timer.current) clearTimeout(timer.current);
    gsap.to(panel.current, {
      yPercent: -100,
      duration: 0.75,
      ease: "expo.inOut",
      onComplete: () => {
        gsap.set(panel.current, { yPercent: 100 });
      },
    });
  }, [path]);
  useEffect(() => {
    const element = panel.current;
    gsap.set(element, { y: 0, yPercent: 100 });
    if (reduced) {
      gsap.set(panel.current, { yPercent: 100 });
      return;
    }
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a");
      if (
        !anchor ||
        anchor.target ||
        anchor.hasAttribute("download") ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (
        url.origin !== location.origin ||
        url.pathname === location.pathname ||
        url.hash
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (pending.current) return;
      pending.current = true;
      anchor.closest("dialog")?.close();
      const label = panel.current?.querySelector("span");
      if (label)
        label.textContent = url.pathname.startsWith("/work/")
          ? "Inside the work."
          : url.pathname === "/work"
            ? "Selected work."
            : "Back to the core.";
      gsap.fromTo(
        panel.current,
        { yPercent: 100 },
        {
          yPercent: 0,
          duration: 0.4,
          ease: "power3.inOut",
          onComplete: () => router.push(url.pathname + url.search),
        },
      );
      timer.current = setTimeout(() => {
        pending.current = false;
        gsap.to(panel.current, { yPercent: -100, duration: 0.4 });
      }, 2200);
    };
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("click", click, true);
      if (timer.current) clearTimeout(timer.current);
      gsap.killTweensOf(element);
    };
  }, [router, reduced]);
  return (
    <div ref={panel} className="route-curtain" aria-hidden="true">
      <span>Inside the work.</span>
    </div>
  );
}
