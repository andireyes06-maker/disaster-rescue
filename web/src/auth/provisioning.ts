// Marks the window in which a brand-new resident account is being set up.
// Firebase signs the user in as soon as the identity exists, but the role and active claims
// arrive only after the API writes the profile. While this window is open, AuthProvider keeps
// the session loading instead of signing the user out. The claims check still runs afterward.
let open = 0;

export async function withProvisioning<T>(task: () => Promise<T>): Promise<T> {
  open += 1;
  try {
    return await task();
  } finally {
    open -= 1;
  }
}

export const isProvisioning = (): boolean => open > 0;
