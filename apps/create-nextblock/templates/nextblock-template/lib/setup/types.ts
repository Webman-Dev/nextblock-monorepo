// Pure, client-safe types for the system_configuration singleton.
// No server-only dependencies — importable from client and server modules.

export interface SystemConfiguration {
  /**
   * When true, new public sign-ups skip outbound email verification: the signup
   * route creates an already-confirmed account via the service role instead of
   * relying on an SMTP confirmation link. Default false (defense-in-depth).
   */
  auto_accept_signups: boolean;
  /** Forward-compatible feature toggles. Never holds secrets. */
  settings: Record<string, unknown>;
}

export const DEFAULT_SYSTEM_CONFIGURATION: SystemConfiguration = {
  auto_accept_signups: false,
  settings: {},
};
