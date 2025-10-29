import { authHandlers } from '$lib/server/convex-auth';
import { createAutumnHandlers } from '$lib/sveltekit/server';
import type { LayoutServerLoad } from './$types';
import { api } from '$lib/convex/_generated/api';

// Delegates Convex HTTP client creation to auth handlers for authenticated requests.
const { getCustomer } = createAutumnHandlers({
  convexApi: api.autumn,
  createClient: authHandlers.createConvexHttpClient
});

/**
 * Provides authentication state and customer billing data to all routes.
 *
 * @param event - SvelteKit request event
 * @returns Auth state and Autumn customer data with fetch timestamp
 */
export const load: LayoutServerLoad = async (event) => {
  // Enables targeted invalidation via invalidate('autumn:customer') to refetch only customer data.
  event.depends('autumn:customer');

  const customer = await getCustomer(event);

  return {
    authState: await authHandlers.getAuthState(event),
    autumnState: {
      customer,
      _timeFetched: Date.now()
    }
  };
};