import type { PageServerLoad } from './$types';
import { api } from '$lib/convex/_generated/api.js';
import { authHandlers } from '$lib/server/convex-auth';

/**
 * Loads authenticated user and message data for the product page.
 *
 * @returns Object containing viewer information and messages list
 */
export const load = (async (event) => {
    const client = await authHandlers.createConvexHttpClient(event);

    const viewer = await client.query(api.users.viewer, {});
    const messages = await client.query(api.messages.list, {});
    return {
		viewer,
		messages
	};
}) satisfies PageServerLoad;