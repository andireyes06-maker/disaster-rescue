import type { Role } from '../types/domain';

export const LANDING: Partial<Record<Role, string>> = { dispatcher: '/dashboard', dmo: '/monitor', responder: '/assignments', resident: '/my', admin: '/admin' };
export const landingFor = (role: Role | null): string => (role && LANDING[role]) || '/forbidden';
