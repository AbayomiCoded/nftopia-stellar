export interface ModelPricing {
  /** USD per 1,000,000 input tokens. */
  inputPerMillion: number;
  /** USD per 1,000,000 output tokens. */
  outputPerMillion: number;
}

/**
 * Per-model Anthropic API pricing used to estimate spend for a chat turn.
 * Used for reporting only — cap enforcement itself is token-count based
 * (AI_CHAT_DAILY_TOKEN_CAP / AI_CHAT_MONTHLY_TOKEN_CAP).
 */
const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  'claude-opus-5': { inputPerMillion: 5, outputPerMillion: 25 },
  'claude-sonnet-5': { inputPerMillion: 2, outputPerMillion: 10 },
  'claude-haiku-4-5': { inputPerMillion: 1, outputPerMillion: 5 },
};

/** Pricing used when a model id isn't in the table — matches the model AiAgentService requests. */
const DEFAULT_PRICING: ModelPricing = MODEL_PRICING['claude-opus-5'];

/** Estimated USD cost of a chat turn, rounded to 6 decimal places. */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING;
  const cost =
    (inputTokens / 1_000_000) * pricing.inputPerMillion +
    (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return Math.round(cost * 1e6) / 1e6;
}
