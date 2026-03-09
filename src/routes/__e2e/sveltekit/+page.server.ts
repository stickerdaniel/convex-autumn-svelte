import type { PageServerLoad } from "./$types";

import { api } from "$lib/convex/_generated/api";
import { authHandlers } from "$lib/server/convex-auth";
import { createAutumnHandlers } from "$lib/sveltekit/server";

const { getCustomer } = createAutumnHandlers({
	convexApi: api.autumn,
	createClient: authHandlers.createConvexHttpClient,
});

export const load: PageServerLoad = async (event) => {
	event.depends("autumn:customer");

	const isAuthenticated = await authHandlers.isAuthenticated(event);
	const customer = isAuthenticated ? await getCustomer(event) : null;

	return {
		autumnState: {
			customer,
			_timeFetched: Date.now(),
		},
	};
};
