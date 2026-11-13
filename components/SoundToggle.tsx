"use client";
import { useSyncExternalStore } from "react";
import {
  getServerSoundEnabled,
  getSoundEnabled,
  setSoundEnabled,
  subscribeSound,
} from "@/lib/sound";

/**
 * Sound is off until asked for. The bars move only while it is on, so the
 * control shows its own state at a glance.
 */
export default function SoundToggle({
  variant = "text",
  className = "",
}: {
  variant?: "text" | "icon";
  className?: string;
}) {
  const on = useSyncExternalStore(
    subscribeSound,
    getSoundEnabled,
    getServerSoundEnabled,
  );
  return (
    <button
      type="button"
      className={`sound-toggle sound-toggle-${variant} ${className}`}
      aria-pressed={on}
      aria-label="Sound"
      data-on={on ? "true" : undefined}
      onClick={() => setSoundEnabled(!on)}
    >
      <span className="sound-bars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      {variant === "text" && (
        <span className="sound-label" aria-hidden="true">
          Sound <b>{on ? "on" : "off"}</b>
        </span>
      )}
    </button>
  );
}
