/**
 * Server-side handlers for Autumn in SvelteKit.
 */

import type { ConvexHttpClient } from "convex/browser";
import type { RequestEvent } from "@sveltejs/kit";
import type { AutumnConvexApi, Customer, Entity } from "../../svelte/types.js";
import { unwrapAutumnResponse } from "../../svelte/types.js";

/**
 * Options for creating Autumn handlers.
 */
export interface AutumnHandlersOptions {
	/** Autumn Convex API object (e.g., api.autumn). */
	convexApi: AutumnConvexApi;
	/**
	 * Factory function to create an authenticated Convex HTTP client.
	 *
	 * This function receives the SvelteKit RequestEvent and should return
	 * a ConvexHttpClient with authentication already configured.
	 *
	 * Works with any auth solution:
	 * - Convex Auth: Pass `createConvexAuthHandlers().createConvexHttpClient`
	 * - BetterAuth: Create client with your BetterAuth token
	 * - Custom: Implement your own client factory
	 *
	 * @example
	 * ```typescript
	 * // With Convex Auth
	 * const authHandlers = createConvexAuthHandlers({ convexUrl: PUBLIC_CONVEX_URL });
	 * const autumnHandlers = createAutumnHandlers({
	 *   convexApi: api.autumn,
	 *   createClient: authHandlers.createConvexHttpClient
	 * });
	 * ```
	 */
	createClient: (event: RequestEvent) => Promise<ConvexHttpClient> | ConvexHttpClient;
}

/**
 * Create server-side handlers for Autumn in SvelteKit.
 *
 * This function creates helpers for fetching Autumn billing data during SSR.
 * It delegates authentication to your auth solution by accepting a client factory function.
 *
 * @param options - Configuration options for Autumn handlers
 * @param options.convexApi - Autumn Convex API object (e.g., api.autumn)
 * @param options.createClient - Factory function to create authenticated Convex client
 *
 * @returns Server-side handler functions
 * @returns {function(RequestEvent): Promise<Customer | null>} getCustomer - Fetch customer data (returns null on error or unauthenticated)
 * @returns {function(RequestEvent, string): Promise<Entity | null>} getEntity - Fetch entity data by ID (returns null on error)
 * @returns {function(RequestEvent): Promise<ConvexHttpClient>} getConvexClient - Get authenticated Convex client from factory
 *
 * @example
 * ```typescript
 * // +layout.server.ts - With Convex Auth
 * import { createConvexAuthHandlers } from '@stickerdaniel/convex-autumn-svelte/sveltekit/server';
 * import { createAutumnHandlers } from '@stickerdaniel/convex-autumn-svelte/autumn/sveltekit/server';
 * import { api } from '$lib/convex/_generated/api';
 * import { PUBLIC_CONVEX_URL } from '$env/static/public';
 * import type { LayoutServerLoad } from './$types';
 *
 * const authHandlers = createConvexAuthHandlers({ convexUrl: PUBLIC_CONVEX_URL });
 *
 * export const load: LayoutServerLoad = async (event) => {
 *   const { getCustomer } = createAutumnHandlers({
 *     convexApi: api.autumn,
 *     createClient: authHandlers.createConvexHttpClient
 *   });
 *
 *   const customer = await getCustomer(event);
 *
 *   return {
 *     autumnState: {
 *       customer,
 *       _timeFetched: Date.now()
 *     }
 *   };
 * };
 * ```
 *
 * @example
 * ```typescript
 * // +page.server.ts - Using getEntity and custom queries
 * import { createConvexAuthHandlers } from '@stickerdaniel/convex-autumn-svelte/sveltekit/server';
 * import { createAutumnHandlers } from '@stickerdaniel/convex-autumn-svelte/autumn/sveltekit/server';
 * import { api } from '$lib/convex/_generated/api';
 * import type { PageServerLoad } from './$types';
 *
 * const authHandlers = createConvexAuthHandlers();
 *
 * export const load: PageServerLoad = async (event) => {
 *   const { getEntity, getConvexClient } = createAutumnHandlers({
 *     convexApi: api.autumn,
 *     createClient: authHandlers.createConvexHttpClient
 *   });
 *
 *   // Fetch specific entity
 *   const entity = await getEntity(event, 'entity-123');
 *
 *   // Make custom Convex queries/mutations
 *   const convex = await getConvexClient(event);
 *   const customData = await convex.query(api.myQuery, {});
 *
 *   return { entity, customData };
 * };
 * ```
 *
 * @example
 * ```typescript
 * // +layout.server.ts - With BetterAuth
 * import { auth } from '$lib/auth'; // Your BetterAuth instance
 * import { createAutumnHandlers } from '@stickerdaniel/convex-autumn-svelte/autumn/sveltekit/server';
 * import { ConvexHttpClient } from 'convex/browser';
 * import { PUBLIC_CONVEX_URL } from '$env/static/public';
 * import { api } from '$lib/convex/_generated/api';
 * import type { LayoutServerLoad } from './$types';
 *
 * export const load: LayoutServerLoad = async (event) => {
 *   const { getCustomer } = createAutumnHandlers({
 *     convexApi: api.autumn,
 *     createClient: async (event) => {
 *       const session = await auth.api.getSession({
 *         headers: event.request.headers
 *       });
 *       const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
 *       if (session?.token) {
 *         client.setAuth(session.token);
 *       }
 *       return client;
 *     }
 *   });
 *
 *   const customer = await getCustomer(event);
 *
 *   return {
 *     autumnState: { customer, _timeFetched: Date.now() }
 *   };
 * };
 * ```
 */
export function createAutumnHandlers({
	convexApi,
	createClient,
}: AutumnHandlersOptions) {
	/**
	 * Get customer data server-side.
	 *
	 * Fetches customer billing data from Autumn during SSR. Automatically
	 * handles customer creation if needed.
	 *
	 * @param event - SvelteKit RequestEvent
	 * @returns Customer object if authenticated, null if unauthenticated or on error
	 *
	 * @example
	 * ```typescript
	 * const { getCustomer } = createAutumnHandlers({
	 *   convexApi: api.autumn,
	 *   createClient: authHandlers.createConvexHttpClient
	 * });
	 * const customer = await getCustomer(event);
	 *
	 * if (customer) {
	 *   console.log('Customer features:', customer.features);
	 * }
	 * ```
	 */
	async function getCustomer(
		event: RequestEvent,
	): Promise<Customer | null> {
		try {
			const client = await createClient(event);

			// Autumn's createCustomer handles both get and auto-creation in one call.
			const response = await client.action(convexApi.createCustomer, {});
			const customer = unwrapAutumnResponse<Customer>(response);

			return customer;
		} catch (error) {
			// Silently return null for unauthenticated users (expected behavior).
			// This occurs when getCustomer is called without a valid auth session.
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (errorMessage.includes("No customer identifier found")) {
				return null;
			}

			// Log unexpected errors for debugging.
			console.error("Error fetching customer data:", error);
			return null;
		}
	}

	/**
	 * Get entity data server-side.
	 *
	 * Fetches a specific entity by ID from Autumn during SSR. Useful for
	 * loading entity-specific billing data on entity detail pages.
	 *
	 * @param event - SvelteKit RequestEvent
	 * @param entityId - The ID of the entity to fetch
	 * @returns Entity object if found, null if not found or on error
	 *
	 * @example
	 * ```typescript
	 * const { getEntity } = createAutumnHandlers({
	 *   convexApi: api.autumn,
	 *   createClient: authHandlers.createConvexHttpClient
	 * });
	 * const entity = await getEntity(event, 'workspace-123');
	 *
	 * if (entity) {
	 *   console.log('Entity balance:', entity.balance);
	 * }
	 * ```
	 */
	async function getEntity(
		event: RequestEvent,
		entityId: string,
	): Promise<Entity | null> {
		try {
			const client = await createClient(event);

			const response = await client.action(convexApi.getEntity, { entityId });

			return unwrapAutumnResponse<Entity>(response);
		} catch (error) {
			console.error("Error fetching entity data:", error);
			return null;
		}
	}

	/**
	 * Get an authenticated Convex HTTP client for server-side operations.
	 *
	 * Returns the ConvexHttpClient from your provided factory. Use this to make
	 * custom Convex queries, mutations, or actions from server load functions.
	 *
	 * @param event - SvelteKit RequestEvent
	 * @returns Authenticated ConvexHttpClient instance ready for server-side calls
	 *
	 * @example
	 * ```typescript
	 * const { getConvexClient } = createAutumnHandlers({
	 *   convexApi: api.autumn,
	 *   createClient: authHandlers.createConvexHttpClient
	 * });
	 * const convex = await getConvexClient(event);
	 *
	 * // Make custom Convex calls
	 * const projects = await convex.query(api.projects.list, {});
	 * const result = await convex.mutation(api.projects.create, { name: 'New Project' });
	 * ```
	 */
	async function getConvexClient(
		event: RequestEvent,
	): Promise<ConvexHttpClient> {
		return await createClient(event);
	}

	return {
		getCustomer,
		getEntity,
		getConvexClient,
	};
}

// Re-export types for convenience.
export type {
	Customer,
	Entity,
	Feature,
	Product,
	CheckParams,
	CheckResult,
	CheckoutParams,
	TrackParams,
	TrackResult,
	AttachParams,
	CancelParams,
	BillingPortalParams,
	BillingPortalResult,
	CreateEntityParams,
	GetEntityParams,
	SetupPaymentParams,
	SetupPaymentResult,
	CreateReferralCodeParams,
	CreateReferralCodeResult,
	RedeemReferralCodeParams,
	RedeemReferralCodeResult,
	SetUsageParams,
	SetUsageResult,
	QueryParams,
	QueryResult,
} from "../../svelte/types.js";
