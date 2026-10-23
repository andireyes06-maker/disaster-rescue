import type { Role } from '../types/domain';

// Dispatcher and DMO accounts have no website access (see src/auth/websiteAccess.ts).
// Only administrators have a website page. Residents and rescuers use the mobile app.
export const LANDING: Partial<Record<Role, string>> = { admin: '/admin' };
export const landingFor = (role: Role | null): string => (role && LANDING[role]) || '/forbidden';
