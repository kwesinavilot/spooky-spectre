/**
 * Price per million tokens for one model. `null` means not configured, and the
 * UI must say so instead of showing a number. Prices change, so they are
 * entered by the user or set in the provider table, never assumed here.
 */
export interface ModelPrice {
  inputPerMillion: number | null;
  outputPerMillion: number | null;
}

export const UNKNOWN_PRICE: ModelPrice = { inputPerMillion: null, outputPerMillion: null };
