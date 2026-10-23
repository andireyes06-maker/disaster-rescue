// The website is for administrators only (professor clarification, 2026-10-23). Dispatcher and DMO
// accounts keep their records and cannot sign in to the website.
export const WEBSITE_RETIRED_ROLES: readonly string[] = ['dispatcher', 'dmo'];

export const hasWebsiteAccess = (role: string | null | undefined): boolean =>
  typeof role === 'string' && role.length > 0 && !WEBSITE_RETIRED_ROLES.includes(role);
