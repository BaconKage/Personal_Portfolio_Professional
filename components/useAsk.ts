"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type AskState = "thinking" | "streaming" | "done" | "refused" | "error";
export type AskEntry = {
  question: string;
  answer: string;
  state: AskState;
  error?: string;
};

const MESSAGES: Record<string, string> = {
  busy: "The core is busy right now. Try again in a moment.",
  unavailable:
    "The core can’t answer right now. You can always email Shubhang.",
  rate: "That’s a lot of questions. Give it a minute, then ask again.",
  disabled: "Ask the core isn’t switched on for this site.",
  too_long: "That question is a little long. Try a shorter one.",
  network: "Couldn’t reach the core. Check your connection and try again.",
  refused:
    "The core can’t help with that one. Try asking about Shubhang’s work.",
  empty: "No answer came back. Try asking another way.",
};
const explain = (code?: string) => MESSAGES[code ?? ""] ?? MESSAGES.unavailable;

/** Earlier exchanges sent back as context; the server keeps the same number. */
const HISTORY = 6;

/**
 * Streams answers from /api/ask (newline-delimited JSON). Only completed
 * exchanges become history, so a failed or refused question never shapes
 * the next answer.
 */
export function useAsk() {
  const [entries, setEntries] = useState<AskEntry[]>([]);
  const controller = useRef<AbortController | null>(null);
  const latest = entries.at(-1);
  const busy = latest?.state === "thinking" || latest?.state === "streaming";

  const update = (patch: Partial<AskEntry>) =>
    setEntries((list) =>
      list.map((entry, i) =>
        i === list.length - 1 ? { ...entry, ...patch } : entry,
      ),
    );

  const ask = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || busy) return;
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      const history = entries
        .filter((e) => e.state === "done")
        .flatMap((e) => [
          { role: "user", content: e.question },
          { role: "assistant", content: e.answer },
        ])
        .slice(-HISTORY);
      setEntries((list) => [
        ...list,
        { question: text, answer: "", state: "thinking" },
      ]);
      try {
        const response = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text, history }),
          signal: request.signal,
        });
        if (!response.ok || !response.body) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          update({ state: "error", error: explain(data.error) });
          return;
        }
        const reader = response.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        let buffer = "",
          answer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let end: number;
          while ((end = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, end).trim();
            buffer = buffer.slice(end + 1);
            if (!line) continue;
            const message = JSON.parse(line) as {
              t?: string;
              reset?: boolean;
              done?: boolean;
              stop?: string;
              error?: string;
            };
            if (message.reset) answer = "";
            if (message.t) {
              answer += message.t;
              update({ answer, state: "streaming" });
            }
            if (message.error) {
              update({ state: "error", error: explain(message.error) });
              return;
            }
            if (message.done) {
              if (message.stop === "refusal")
                update({
                  answer: "",
                  state: "refused",
                  error: explain("refused"),
                });
              else if (!answer.trim())
                update({ state: "error", error: explain("empty") });
              else update({ answer, state: "done" });
              return;
            }
          }
        }
        update({ state: "error", error: explain("network") });
      } catch {
        if (!request.signal.aborted)
          update({ state: "error", error: explain("network") });
      }
    },
    [busy, entries],
  );

  const reset = useCallback(() => {
    controller.current?.abort();
    setEntries([]);
  }, []);

  useEffect(() => () => controller.current?.abort(), []);
  return { entries, ask, busy, reset };
}
