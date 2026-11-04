/**
 * Request guards for "Ask the core". Pure and dependency-free so they run
 * in Node tests. They bound what one visitor can spend; the real ceiling is
 * the spend limit on the Anthropic account (see README).
 */
export const ASK_LIMITS = {
  /** Characters in a new question. */
  question: 400,
  /** Earlier turns sent back as context (user + assistant messages). */
  turns: 6,
  /** Characters in any earlier turn. */
  turnChars: 2000,
  /** Questions per visitor, per server instance. */
  perMinute: 6,
  perDay: 60,
};

export type AskTurn = { role: "user" | "assistant"; content: string };
export type AskParse =
  { ok: true; messages: AskTurn[] } | { ok: false; error: string };

const isTurn = (value: unknown): value is AskTurn =>
  typeof value === "object" &&
  value !== null &&
  ((value as AskTurn).role === "user" ||
    (value as AskTurn).role === "assistant") &&
  typeof (value as AskTurn).content === "string";

/**
 * Validates `{ question, history? }` and returns the messages to send:
 * the most recent complete exchanges, then the new question.
 */
export function parseAsk(body: unknown, limits = ASK_LIMITS): AskParse {
  if (typeof body !== "object" || body === null)
    return { ok: false, error: "invalid" };
  const { question, history } = body as {
    question?: unknown;
    history?: unknown;
  };
  if (typeof question !== "string") return { ok: false, error: "invalid" };
  const text = question.trim();
  if (!text) return { ok: false, error: "empty" };
  if (text.length > limits.question) return { ok: false, error: "too_long" };
  if (history !== undefined && !Array.isArray(history))
    return { ok: false, error: "invalid" };
  const turns = (history ?? []) as unknown[];
  if (turns.length > 40 || !turns.every(isTurn))
    return { ok: false, error: "invalid" };
  // Earlier turns must alternate user/assistant from a user turn and end on
  // an answer, so the new question continues the conversation cleanly.
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i] as AskTurn;
    if (turn.role !== (i % 2 === 0 ? "user" : "assistant"))
      return { ok: false, error: "invalid" };
    if (!turn.content.trim() || turn.content.length > limits.turnChars)
      return { ok: false, error: "invalid" };
  }
  if (turns.length % 2 !== 0) return { ok: false, error: "invalid" };
  // Keep whole exchanges only, so the kept history still starts on a user turn.
  const keep = limits.turns - (limits.turns % 2);
  const recent = (turns as AskTurn[]).slice(Math.max(0, turns.length - keep));
  return {
    ok: true,
    messages: [
      ...recent.map(({ role, content }) => ({ role, content })),
      { role: "user", content: text },
    ],
  };
}

/**
 * Fixed-window counters per key (a visitor's address). In memory, so each
 * server instance counts on its own: a cheap brake, not an exact quota.
 */
export function createRateLimiter(
  limits: { perMinute: number; perDay: number } = ASK_LIMITS,
  now: () => number = Date.now,
  maxKeys = 5000,
) {
  const MINUTE = 60_000,
    DAY = 86_400_000;
  const seen = new Map<
    string,
    { minute: number; minuteCount: number; day: number; dayCount: number }
  >();
  return {
    take(key: string): { ok: boolean; retryAfter: number } {
      const t = now();
      const minute = Math.floor(t / MINUTE),
        day = Math.floor(t / DAY);
      let entry = seen.get(key);
      if (!entry) {
        if (seen.size >= maxKeys) {
          // Forget the oldest visitor rather than grow without bound.
          const oldest = seen.keys().next().value;
          if (oldest !== undefined) seen.delete(oldest);
        }
        entry = { minute, minuteCount: 0, day, dayCount: 0 };
        seen.set(key, entry);
      }
      if (entry.minute !== minute) {
        entry.minute = minute;
        entry.minuteCount = 0;
      }
      if (entry.day !== day) {
        entry.day = day;
        entry.dayCount = 0;
      }
      if (entry.dayCount >= limits.perDay)
        return {
          ok: false,
          retryAfter: Math.ceil(((day + 1) * DAY - t) / 1000),
        };
      if (entry.minuteCount >= limits.perMinute)
        return {
          ok: false,
          retryAfter: Math.ceil(((minute + 1) * MINUTE - t) / 1000),
        };
      entry.minuteCount++;
      entry.dayCount++;
      return { ok: true, retryAfter: 0 };
    },
  };
}

/**
 * Browsers always send Origin on a cross-site POST, so requiring it to match
 * the host keeps other sites from spending this budget from their pages.
 */
export function sameOrigin(origin: string | null, host: string | null) {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
