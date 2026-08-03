/**
 * Standard result shape for CMS settings server actions.
 *
 * Next replaces the message of an uncaught Server Action error with a generic string in
 * production builds, so anything the operator has to be able to read — a permission
 * refusal, a relay's rejection, a validation complaint — must come back as data rather
 * than as a throw. Actions that only ever fail in ways nobody needs to read (pure data
 * readers rendered by a Server Component) can still throw and hit the error boundary.
 */
export type SettingsActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };
