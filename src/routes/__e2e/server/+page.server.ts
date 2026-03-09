import type { PageServerLoad } from "./$types";

import { api } from "$lib/convex/_generated/api";
import { authHandlers } from "$lib/server/convex-auth";
import { createAutumnHandlers } from "$lib/sveltekit/server";

const autumnHandlers = createAutumnHandlers({
	convexApi: api.autumn,
	createClient: authHandlers.createConvexHttpClient,
});

export const load: PageServerLoad = async (event) => {
	const entityId = event.url.searchParams.get("entityId");
	const customer = await autumnHandlers.getCustomer(event);
	const entity = entityId ? await autumnHandlers.getEntity(event, entityId) : null;

	let viewer = null;
	try {
		const client = await autumnHandlers.getConvexClient(event);
		viewer = await client.query(api.users.viewer, {});
	} catch (error) {
		viewer = null;
	}

	return {
		customer,
		entity,
		entityId,
		viewer,
	};
};
