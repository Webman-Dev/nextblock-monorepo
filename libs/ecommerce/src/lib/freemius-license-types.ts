// Shared, dependency-free shape for a Freemius license surfaced to the buyer.
// Kept in its own module so client components can import the type without
// pulling in the server-only Freemius SDK / Supabase code that resolves it.
export interface FreemiusOrderLicense {
  /** Freemius license id captured on the order (always present). */
  licenseId: string;
  /**
   * The activatable license key (Freemius `secret_key`), fetched on demand and
   * never stored locally. Null when it could not be resolved (e.g. the Freemius
   * API was unreachable or no key has been issued yet) — surface the email
   * fallback in that case.
   */
  licenseKey: string | null;
  /** Freemius plan id the license belongs to, when known. */
  planId: string | null;
  /** License expiration (ISO) — for trials this is the trial end. */
  expiration: string | null;
  /** Trial end recorded on the order, if the order started as a trial. */
  trialEndsAt: string | null;
  /** Whether Freemius reports the license as cancelled. */
  isCancelled: boolean;
}
