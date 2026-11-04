import Anthropic from "@anthropic-ai/sdk";
import {
  about,
  education,
  experience,
  profile,
  recognition,
  research,
} from "@/data/profile";
import { projects } from "@/data/projects";
import { askEnabled, askModel, supportsFallback } from "@/lib/ask-config";
import {
  ASK_LIMITS,
  createRateLimiter,
  parseAsk,
  sameOrigin,
} from "@/lib/ask-guard";
import { buildSystemPrompt } from "@/lib/ask-knowledge";

/** A short answer streams well inside this; the platform enforces it. */
export const maxDuration = 30;

/**
 * Output ceiling per answer, thinking included. Answers are asked to be two
 * to four sentences, so this is a deliberate cost cap on a public endpoint.
 */
const MAX_TOKENS = 1500;

const system = buildSystemPrompt({
  profile,
  research,
  about,
  education,
  experience,
  recognition,
  projects,
});
const limiter = createRateLimiter(ASK_LIMITS);
let client: Anthropic | null = null;

const json = (body: object, status: number, headers: HeadersInit = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });

/**
 * What the page tells the visitor. Only Anthropic rate limiting is worth a
 * "try again shortly"; a bad key, connection failure or any other error
 * reads as unavailable. Details stay in the server log.
 */
const failure = (error: unknown) =>
  error instanceof Anthropic.RateLimitError ? "busy" : "unavailable";

export async function POST(request: Request) {
  if (!askEnabled()) return json({ error: "disabled" }, 503);
  if (!sameOrigin(request.headers.get("origin"), request.headers.get("host")))
    return json({ error: "forbidden" }, 403);

  const visitor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const slot = limiter.take(visitor);
  if (!slot.ok)
    return json({ error: "rate" }, 429, {
      "Retry-After": String(slot.retryAfter),
    });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid" }, 400);
  }
  const parsed = parseAsk(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  client ??= new Anthropic({ maxRetries: 1, timeout: 25_000 });
  const model = askModel();
  const stream = client.beta.messages.stream(
    {
      model,
      max_tokens: MAX_TOKENS,
      // Short factual chat: low effort keeps answers quick and cheap.
      output_config: { effort: "low" },
      // Identical on every request, so it is served from the prompt cache.
      system: [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ],
      messages: parsed.messages,
      // If a safety classifier declines, the API retries on its recommended
      // model inside the same call instead of returning the refusal.
      ...(supportsFallback(model)
        ? {
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default" as const,
          }
        : {}),
    },
    // The visitor closing the panel or leaving cancels generation.
    { signal: request.signal },
  );

  const encoder = new TextEncoder();
  const lines = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: object) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_start" &&
            event.content_block.type === "fallback"
          )
            // The declined model's partial answer is replaced by the fallback's.
            send({ reset: true });
          else if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          )
            send({ t: event.delta.text });
        }
        const final = await stream.finalMessage();
        send({ done: true, stop: final.stop_reason });
      } catch (error) {
        if (!request.signal.aborted) {
          console.error(
            "ask: request failed",
            error instanceof Anthropic.APIError ? error.status : "",
            error instanceof Error ? error.message : error,
          );
          send({ error: failure(error) });
        }
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(lines, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
