import type { Category, Concern, Effect } from '../schema';

/** Categories that count as financial for the "spectral hand" effect (design steering 5.2). */
const FINANCIAL: Category[] = ['billing', 'cancellation'];
const HAND_CATEGORIES: Category[] = [...FINANCIAL, 'privacy'];

/** Possession needs this much confidence on top of a verified high-impact finding (design steering 5.3). */
export const POSSESSION_CONFIDENCE = 0.85;

/**
 * Chooses the visual effect for one finding. Effects are only for verified
 * findings: an unverified finding is never shown with an effect (evidence or silence).
 */
export function effectFor(
  concern: Concern,
  category: Category,
  verified: boolean,
  confidence: number,
): Effect {
  if (!verified) return 'whisper';
  if (concern === 'low') return 'whisper';
  if (concern === 'medium') return HAND_CATEGORIES.includes(category) ? 'hand' : 'haunting';
  return confidence >= POSSESSION_CONFIDENCE ? 'possession' : 'haunting';
}
