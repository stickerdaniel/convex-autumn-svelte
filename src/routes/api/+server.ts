import type { RequestHandler } from './$types';
import { authHandlers } from '#lib/server/convex-auth.ts';

const { isAuthenticated: isAuthenticatedPromise } = authHandlers;

/**
 * GET handler that returns authentication status.
 *
 * @param event - SvelteKit request event
 * @returns JSON response with authentication status and appropriate HTTP status code
 * @example
 * ```ts
 * // GET /api
 * // Response: { someData: true } with status 200 if authenticated
 * // Response: { someData: false } with status 403 if not authenticated
 * ```
 */
export const GET: RequestHandler = async (event) => {
	const isAuthenticated = await isAuthenticatedPromise(event);
	return Response.json({ someData: isAuthenticated }, { status: isAuthenticated ? 200 : 403 });
};
