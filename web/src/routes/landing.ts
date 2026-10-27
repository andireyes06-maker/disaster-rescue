import type { Role } from '../types/domain';

// Dispatcher and DMO accounts have no website access (see src/auth/websiteAccess.ts).
// Administrators and rescuers (responders) have website pages. Residents use the mobile app only.
export const LANDING: Partial<Record<Role, string>> = { admin: '/dashboard', responder: '/assignments' };
export const landingFor = (role: Role | null): string => (role && LANDING[role]) || '/forbidden';
