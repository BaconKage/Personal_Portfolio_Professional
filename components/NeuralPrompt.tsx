"use client";
import { useEffect, useState } from "react";
export default function NeuralPrompt() {
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => setSent(false), 1800);
    return () => clearTimeout(timer);
  }, [sent]);
  return (
    <div className="neural-prompt">
      <span>
        NEURAL STUDY <i /> MOVE TO FOCUS
      </span>
      <button
        onClick={() => {
          window.dispatchEvent(new Event("neural-signal"));
          setSent(true);
        }}
      >
        {sent ? "Core energised ↗" : "Energise the core ↗"}
      </button>
      <span className="sr-only" role="status">
        {sent ? "A charge is travelling through the sculptural AI core." : ""}
      </span>
    </div>
  );
}
