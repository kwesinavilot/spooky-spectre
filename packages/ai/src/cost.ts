/** Rough token count from text length (about four characters per token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
