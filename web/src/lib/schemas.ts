import { z } from 'zod';

// Client-side checks are a convenience only. The API remains the authority.

export const OPERATION_STATUSES = ['Rescue in Progress', 'Resolved'] as const;
export const MAX_PEOPLE_RESCUED = 10000;
export const MAX_NOTE_LENGTH = 1000;
export const PEOPLE_RESCUED_ERROR = 'People rescued must be a whole number from 0 to 10000.';
export const ASSIGN_TEAM_ERROR = 'Choose a free rescue team.';
export const TEAM_NAME_ERROR = 'Team names must be 1 to 100 characters.';
export const STAFF_ROLE_OPTIONS = ['responder', 'dispatcher', 'dmo'] as const;

export const operationUpdateSchema = z.object({
  status: z.enum(OPERATION_STATUSES),
  peopleRescued: z
    .number({ error: PEOPLE_RESCUED_ERROR })
    .int({ error: PEOPLE_RESCUED_ERROR })
    .min(0, { error: PEOPLE_RESCUED_ERROR })
    .max(MAX_PEOPLE_RESCUED, { error: PEOPLE_RESCUED_ERROR }),
  note: z.string().trim().max(MAX_NOTE_LENGTH, { error: `Notes can be at most ${MAX_NOTE_LENGTH} characters.` }),
});

export type OperationUpdate = z.infer<typeof operationUpdateSchema>;

export function assignTeamSchema(freeTeamIds: readonly string[]) {
  return z.object({
    teamId: z.string().refine((id) => freeTeamIds.includes(id), { error: ASSIGN_TEAM_ERROR }),
  });
}

export type AssignTeam = z.infer<ReturnType<typeof assignTeamSchema>>;

export const teamNameSchema = z.object({
  name: z.string().trim().min(1, { error: TEAM_NAME_ERROR }).max(100, { error: TEAM_NAME_ERROR }),
});

export type TeamName = z.infer<typeof teamNameSchema>;

export const staffAccountSchema = z.object({
  email: z.string().trim().min(1, { error: 'Enter an email address.' }),
  name: z.string().trim().min(1, { error: 'Enter a name.' }).max(100, { error: 'Names must be 100 characters or fewer.' }),
  role: z.enum(STAFF_ROLE_OPTIONS),
  team: z.string(),
});

export type StaffAccount = z.infer<typeof staffAccountSchema>;

// Same phone rule as the API (PHONE_RE in api/src/domain/validation.js).
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

export const residentSignUpSchema = z
  .object({
    name: z.string().trim().min(1, { error: 'Enter your name.' }).max(100, { error: 'Name can be at most 100 characters.' }),
    email: z.string().trim().email({ error: 'Enter a valid email.' }),
    phone: z.string().trim().regex(PHONE_PATTERN, { error: 'Enter a valid phone number.' }),
    password: z.string().min(8, { error: 'Password must be at least 8 characters.' }).max(128, { error: 'Password is too long.' }),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { error: 'Passwords do not match', path: ['confirmPassword'] });

export type ResidentSignUp = z.infer<typeof residentSignUpSchema>;
