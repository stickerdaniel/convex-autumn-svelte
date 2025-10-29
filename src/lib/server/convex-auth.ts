import { createConvexAuthHandlers } from '@mmailaender/convex-auth-svelte/sveltekit/server';

/**
 * Shared Convex Auth handlers singleton for SvelteKit request handling.
 *
 * Auto-detects convexUrl from PUBLIC_CONVEX_URL environment variable.
 * Export this instance to ensure consistent auth configuration across the app.
 *
 * @returns Configured Convex Auth handlers for SvelteKit hooks
 */
export const authHandlers = createConvexAuthHandlers();
