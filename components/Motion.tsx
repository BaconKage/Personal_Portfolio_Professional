"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
const Graphics = dynamic(() => import("@/components/canvas/Graphics"), {
  ssr: false,
});
const RouteTransition = dynamic(() => import("./RouteTransition"), {
  ssr: false,
});

export default function Motion() {
  const path = usePathname();
  const [graphics, setGraphics] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [preference, setPreference] = useState("system");
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = (event?: Event) => {
      let preference = "system";
      try {
        preference = localStorage.getItem("portfolio-motion") || "system";
      } catch {}
      if (event instanceof CustomEvent) preference = event.detail;
      setPreference(preference);
      const off = media.matches || preference === "reduced";
      setReduced(off);
      document.documentElement.dataset.motion = off ? "reduced" : "system";
      setGraphics(!off);
    };
    update();
    media.addEventListener("change", update);
    window.addEventListener("motion-change", update);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("motion-change", update);
    };
  }, []);
  useEffect(() => {
    if (reduced) return;
    let dispose = () => {};
    let cancelled = false;
    let breakpoint: MediaQueryList | undefined;
    let remount = () => {};
    import("./choreography")
      .then(({ mountChoreography }) => {
        if (cancelled) return;
        remount = () => {
          dispose();
          dispose = mountChoreography();
        };
        remount();
        breakpoint = matchMedia("(min-width: 900px)");
        breakpoint.addEventListener("change", remount);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      breakpoint?.removeEventListener("change", remount);
      dispose();
    };
  }, [path, reduced]);
  return (
    <>
      {graphics && <Graphics />}
      {!reduced && <RouteTransition reduced={reduced} />}
      {!reduced && <div className="scroll-progress" aria-hidden="true" />}
      <div className="motion-setting">
        <label htmlFor="motion-mode">Motion</label>
        <select
          id="motion-mode"
          aria-label="Motion preference"
          value={preference}
          onChange={(e) => {
            try {
              localStorage.setItem("portfolio-motion", e.target.value);
            } catch {}
            window.dispatchEvent(
              new CustomEvent("motion-change", { detail: e.target.value }),
            );
          }}
        >
          <option value="system">System</option>
          <option value="reduced">Reduced</option>
        </select>
      </div>
    </>
  );
}
