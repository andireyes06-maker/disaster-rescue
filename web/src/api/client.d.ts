// Type declarations for client.js. Runtime behavior stays in client.js.

export interface ApiOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
  getToken?: () => Promise<string | null>;
}

export declare class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  constructor(init: { status: number; code?: string; message?: string });
}

export declare function api(path: string, options?: ApiOptions): Promise<unknown>;
