/**
 * Privacy defaults (FR-PRIV-01 / FR-PRIV-02). The excluded-domains list covers
 * common banking, health and email providers by default. `shouldAnalyze` is the
 * single gate the content layer consults before any analysis.
 */
export const DEFAULT_EXCLUDED_DOMAINS = [
  // Banking
  'bankofamerica.com',
  'chase.com',
  'wellsfargo.com',
  'citibank.com',
  'capitalone.com',
  'hsbc.com',
  'barclays.co.uk',
  // Health
  'nhs.uk',
  'mayoclinic.org',
  'webmd.com',
  'cigna.com',
  'kaiserpermanente.org',
  // Email
  'mail.google.com',
  'outlook.live.com',
  'mail.yahoo.com',
] as const;

/** Selectors whose text must never be read or analyzed. */
export const SENSITIVE_INPUT_SELECTORS = [
  'input[type="password"]',
  'input[type="card"]',
  '[autocomplete*="cc-"]',
  '[autocomplete*="password"]',
] as const;

/** Returns true if analysis is permitted for the given host. */
export function shouldAnalyze(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, '');
  return !DEFAULT_EXCLUDED_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`));
}
