import type { Database } from '@nextblock-cms/db';

type AuthProfile = Pick<Database['public']['Tables']['profiles']['Row'], 'role' | 'full_name'> | null;

const DASHBOARD_PATH = '/cms/dashboard';
const HOME_PATH = '/';
const PROFILE_PATH = '/profile';
const PASSWORD_RESET_PATH = '/profile/password';

function isSafeInternalPath(path?: string | null) {
  return Boolean(path && path.startsWith('/') && !path.startsWith('//'));
}

function isDashboardPath(path: string) {
  return path === DASHBOARD_PATH || path.startsWith(`${DASHBOARD_PATH}/`);
}

export function isCustomerProfileComplete(profile: AuthProfile) {
  return Boolean(profile?.full_name?.trim());
}

export function resolvePostAuthRedirect(
  profile: AuthProfile,
  requestedPath?: string | null
) {
  const safePath = isSafeInternalPath(requestedPath) ? requestedPath : null;
  const role = profile?.role ?? null;

  if (safePath === PASSWORD_RESET_PATH) {
    return PASSWORD_RESET_PATH;
  }

  if (role === 'ADMIN' || role === 'WRITER') {
    return safePath ?? DASHBOARD_PATH;
  }

  if (!isCustomerProfileComplete(profile)) {
    return PROFILE_PATH;
  }

  if (safePath && !isDashboardPath(safePath)) {
    return safePath;
  }

  return HOME_PATH;
}
