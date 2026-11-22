import type { ModelPrice } from './types';

/** Rough token count from text length (about four characters per token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface CostEstimate {
  inputTokens: number;
  /** Estimated input cost, or null when the model's price is not configured. */
  cost: number | null;
  label: string;
}

/**
 * Estimates the cost of sending `text`, from the chosen model's configured
 * prices. Returns an honest label when no price is set.
 */
export function estimateCost(text: string, price: ModelPrice, expectedOutputTokens = 600): CostEstimate {
  const inputTokens = estimateTokens(text);
  if (price.inputPerMillion === null || price.outputPerMillion === null) {
    return {
      inputTokens,
      cost: null,
      label: `About ${inputTokens.toLocaleString('en-US')} tokens. Price not set for this model.`,
    };
  }
  const cost =
    (inputTokens / 1_000_000) * price.inputPerMillion + (expectedOutputTokens / 1_000_000) * price.outputPerMillion;
  return {
    inputTokens,
    cost,
    label: `About ${inputTokens.toLocaleString('en-US')} tokens, roughly ${formatMoney(cost)} (estimate).`,
  };
}

function formatMoney(n: number): string {
  if (n < 0.01) return 'under one cent';
  return `$${n.toFixed(2)}`;
}
