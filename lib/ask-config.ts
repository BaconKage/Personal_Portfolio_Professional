/**
 * "Ask the core" is off until the site owner adds an API key, so a fresh
 * deployment never spends anything. Read on the server only: pages are
 * prerendered, so add the key and redeploy to switch the feature on.
 */
export const askEnabled = () =>
  Boolean(process.env.ANTHROPIC_API_KEY) || process.env.ASK_ENABLED === "1";

/** Claude Opus 5.5 by default; set ASK_MODEL to choose another model. */
export const askModel = () => process.env.ASK_MODEL || "claude-opus-5-5";

/** Models that accept server-side refusal fallback (`fallbacks: "default"`). */
const FALLBACK_MODELS = new Set([
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-fable-5-1",
  "claude-sonnet-5-5",
]);
export const supportsFallback = (model: string) => FALLBACK_MODELS.has(model);
