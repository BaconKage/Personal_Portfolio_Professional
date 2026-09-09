"use client";
import { useState } from "react";
const steps: Record<string, { label: string; description: string }[]> = {
  vanicert: [
    {
      label: "Input",
      description: "The complete recording enters the analysis pipeline.",
    },
    {
      label: "Speech",
      description: "Silero VAD isolates speech from non-speech segments.",
    },
    {
      label: "Analysis",
      description: "AASIST and DSP examine different properties of the signal.",
    },
    {
      label: "Consensus",
      description: "The analyses inform the returned classification.",
    },
  ],
  "firstdrop-ai": [
    {
      label: "Scenario",
      description: "People and context frame the rehearsal.",
    },
    {
      label: "Conversation",
      description: "The room responds as tension evolves.",
    },
    {
      label: "Reflection",
      description: "A session report brings communication feedback together.",
    },
  ],
  bhashabuddy: [
    { label: "Hindi", description: "अ — a Devanagari character." },
    { label: "Tamil", description: "அ — a Tamil character." },
    { label: "Telugu", description: "అ — a Telugu character." },
    { label: "Kannada", description: "ಅ — a Kannada character." },
  ],
  "posture-engine": [
    {
      label: "Position",
      description:
        "Illustrative joint landmarks establish a starting position.",
    },
    {
      label: "Movement",
      description: "Joint relationships change as the body moves.",
    },
    {
      label: "Review",
      description:
        "Angles and movement phases inform form and repetition feedback.",
    },
  ],
  mygym: [
    {
      label: "Enquiry",
      description: "The member journey begins with an enquiry.",
    },
    {
      label: "Connect",
      description: "Consultation, sale, and payment preserve the same context.",
    },
    {
      label: "Coach",
      description: "Onboarding, coaching, and progress continue that record.",
    },
  ],
};
export default function SceneControls({ id }: { id: string }) {
  const [active, setActive] = useState(0);
  const items = steps[id];
  if (!items) return null;
  return (
    <div className="scene-controls">
      <div role="group" aria-label="Explore the system illustration">
        {items.map((s, i) => (
          <button
            key={s.label}
            aria-pressed={active === i}
            onClick={() => {
              setActive(i);
              window.dispatchEvent(
                new CustomEvent("scene-step", { detail: { id, step: i } }),
              );
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p aria-live="polite">{items[active].description}</p>
      <span className="eyebrow">ILLUSTRATION · NOT LIVE PRODUCT OUTPUT</span>
    </div>
  );
}
