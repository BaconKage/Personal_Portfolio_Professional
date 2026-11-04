"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { projects } from "@/data/projects";
import { mentionedProjects } from "@/lib/ask-knowledge";
import { ASK_LIMITS } from "@/lib/ask-guard";
import { useAsk } from "./useAsk";

const SUGGESTIONS = [
  "What has Shubhang actually shipped?",
  "Which projects did he build solo?",
  "What is his research about?",
  "How do I get in touch?",
];

/**
 * "Ask the core": questions about Shubhang, answered from the site's own
 * content. Used inside the command palette and inline beside Contact.
 */
export default function AskPanel({
  variant,
  initial,
  onBack,
}: {
  variant: "palette" | "inline";
  /** Asked once on mount (the palette passes the query that opened it). */
  initial?: string;
  onBack?: () => void;
}) {
  const { entries, ask, busy } = useAsk();
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const id = useId();

  useEffect(() => {
    if (!initial || started.current) return;
    started.current = true;
    ask(initial);
  }, [initial, ask]);
  useEffect(() => {
    if (variant === "palette") input.current?.focus();
  }, [variant]);
  // Keep the newest answer in view as it streams, inside the panel only.
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const latest = entries.at(-1);
  const announcement =
    latest?.state === "done"
      ? latest.answer
      : latest?.state === "refused" || latest?.state === "error"
        ? latest.error
        : busy
          ? "The core is answering."
          : "";

  const submit = (question: string) => {
    if (!question.trim() || busy) return;
    ask(question);
    setDraft("");
  };

  return (
    <div className={`ask ask-${variant}`} data-lens-off>
      {variant === "palette" && (
        <div className="ask-top">
          {onBack && (
            <button type="button" className="ask-back" onClick={onBack}>
              ← Commands
            </button>
          )}
          <span className="ask-badge">
            <i /> ASK THE CORE
          </span>
        </div>
      )}
      <div className="ask-log" ref={log}>
        {entries.length === 0 && (
          <div className="ask-suggestions">
            <p>Ask anything about Shubhang’s work. For example:</p>
            <div>
              {SUGGESTIONS.map((s) => (
                <button type="button" key={s} onClick={() => submit(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {entries.map((entry, i) => {
          const linked =
            entry.state === "done"
              ? mentionedProjects(entry.answer, projects)
              : [];
          return (
            <div className="ask-entry" key={i}>
              <p className="ask-question">{entry.question}</p>
              <div className="ask-answer" data-state={entry.state}>
                {entry.state === "thinking" ? (
                  <span className="ask-thinking" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : entry.state === "refused" || entry.state === "error" ? (
                  <p className="ask-error">{entry.error}</p>
                ) : (
                  <p>{entry.answer}</p>
                )}
              </div>
              {linked.length > 0 && (
                <div className="ask-links">
                  {linked.map((p) => (
                    <Link key={p.slug} href={`/work/${p.slug}`}>
                      {p.title} case study <span aria-hidden="true">↗</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      <form
        className="ask-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <label htmlFor={`${id}-question`} className="sr-only">
          Your question for the core
        </label>
        <input
          ref={input}
          id={`${id}-question`}
          type="text"
          value={draft}
          maxLength={ASK_LIMITS.question}
          autoComplete="off"
          placeholder={
            entries.length ? "Ask a follow-up…" : "Ask the core about Shubhang…"
          }
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" aria-disabled={busy || !draft.trim()}>
          {busy ? "Answering…" : "Ask"}
        </button>
      </form>
      <p className="ask-note">
        Written by Claude from this site’s content, so it can be wrong. Your
        questions are sent to Anthropic to answer them.
      </p>
    </div>
  );
}
