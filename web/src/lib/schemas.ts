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
