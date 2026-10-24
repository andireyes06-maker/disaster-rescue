// Who may use the website. Residents use the mobile app only. Dispatcher and DMO accounts have no website
// access (professor clarification, 2026-10-23); their records are kept. Administrators and rescuers (responders) can sign in.
export const WEBSITE_RETIRED_ROLES: readonly string[] = ['dispatcher', 'dmo'];
export const MOBILE_ONLY_ROLES: readonly string[] = ['resident'];

export const hasWebsiteAccess = (role: string | null | undefined): boolean =>
  typeof role === 'string' && role.length > 0 && !WEBSITE_RETIRED_ROLES.includes(role) && !MOBILE_ONLY_ROLES.includes(role);

// The reason a refused account is signed out, or null when the role may use the website.
export const websiteRefusalFor = (role: string): 'resident_mobile_only' | 'website_access_disabled' | null => {
  if (hasWebsiteAccess(role)) return null;
  return MOBILE_ONLY_ROLES.includes(role) ? 'resident_mobile_only' : 'website_access_disabled';
};
