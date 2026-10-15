import { ApiError } from '../api/client';

export interface ApiFailure {
  status: number;
  code?: string;
}

// Pulls status and code from an ApiError, or from any thrown object shaped like one.
export function apiFailure(err: unknown): ApiFailure | null {
  if (err instanceof ApiError) return { status: err.status, code: err.code };
  if (typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number') {
    const code = 'code' in err && typeof err.code === 'string' ? err.code : undefined;
    return { status: err.status, code };
  }
  return null;
}
