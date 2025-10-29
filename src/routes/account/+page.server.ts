import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { api } from '$lib/convex/_generated/api.js';
import { createConvexAuthHandlers } from '@mmailaender/convex-auth-svelte/sveltekit/server';

/**
 * Loads account page data with authentication enforcement.
 *
 * Verifies user authentication and redirects unauthenticated users to signin.
 *
 * @param event - SvelteKit request event containing cookies and headers
 * @returns Empty object after authentication verification
 * @throws {Redirect} 303 redirect to /signin if user is not authenticated
 */
export const load = (async (event) => {
	const { createConvexHttpClient } = await createConvexAuthHandlers();
	const client = await createConvexHttpClient(event);

	const viewer = await client.query(api.users.viewer, {});

	// Protect account page from unauthenticated access.
	if (!viewer) {
		throw redirect(303, '/signin');
	}

	return {};
}) satisfies PageServerLoad;
