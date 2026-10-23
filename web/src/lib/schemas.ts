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
  email: z.string().trim().email({ error: 'Enter a valid email address.' }),
  name: z.string().trim().min(1, { error: 'Enter a name.' }).max(100, { error: 'Names must be 100 characters or fewer.' }),
  role: z.enum(STAFF_ROLE_OPTIONS),
  team: z.string(),
});

export type StaffAccount = z.infer<typeof staffAccountSchema>;

// Same phone rule as the API (PHONE_RE in api/src/domain/validation.js).
export const PHONE_PATTERN = /^(?=(?:\D*\d){7,15}\D*$)[0-9+()\-\s]{7,25}$/;
export const HOTLINE_PATTERN = /^(?=(?:\D*\d){3,15}\D*$)[0-9+()\-\s]{3,40}$/;

export const residentSignUpSchema = z
  .object({
    name: z.string().trim().min(1, { error: 'Enter your name.' }).max(100, { error: 'Name can be at most 100 characters.' }),
    email: z.string().trim().email({ error: 'Enter a valid email.' }),
    phone: z.string().trim().regex(PHONE_PATTERN, { error: 'Enter a valid phone number.' }),
    password: z.string().min(8, { error: 'Password must be at least 8 characters.' }).max(128, { error: 'Password is too long.' }),
    confirmPassword: z.string().min(1, { error: 'Confirm your password.' }),
  })
  .refine((d) => d.password === d.confirmPassword, { error: 'Passwords do not match', path: ['confirmPassword'] });

export type ResidentSignUp = z.infer<typeof residentSignUpSchema>;

export const REPORT_PHOTO_MAX = 5;
export const REPORT_PHOTO_BYTES = 5 * 1024 * 1024;
export const REPORT_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// Mirrors api/src/domain/validation.js. The API checks the same rules and remains the authority.
export const webReportSchema = z.object({
  type: z.enum(['flood', 'fire', 'earthquake', 'landslide', 'other'], { error: 'Choose the type of emergency.' }),
  description: z.string().trim().min(3, { error: 'Describe the emergency in at least 3 characters.' }).max(1000, { error: 'Description can be at most 1000 characters.' }),
  lat: z.number({ error: 'Pick a location or use GPS before you submit.' }).min(-90).max(90),
  lng: z.number({ error: 'Pick a location or use GPS before you submit.' }).min(-180).max(180),
  source: z.enum(['gps', 'manual']),
  addressText: z.string().trim().max(300, { error: 'Address can be at most 300 characters.' }),
});

export function checkReportPhotos(files: File[]): string | null {
  if (files.length > REPORT_PHOTO_MAX) return `At most ${REPORT_PHOTO_MAX} photos allowed.`;
  for (const f of files) {
    if (!(REPORT_PHOTO_TYPES as readonly string[]).includes(f.type)) return 'Photos must be JPEG, PNG, or WebP.';
    if (f.size > REPORT_PHOTO_BYTES) return 'Each photo must be 5 MB or smaller.';
  }
  return null;
}
