export const LANDING = { dispatcher: '/dashboard', dmo: '/monitor', responder: '/assignments' };
export const landingFor = (role) => LANDING[role] || '/forbidden';
