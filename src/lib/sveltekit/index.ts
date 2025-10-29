/**
 * SvelteKit bindings for Autumn billing integration
 *
 * @module
 */

import {
	createAutumnClientSvelteKit,
	setAutumnContext,
	getAutumnContext,
	hasAutumnContext,
} from "./client.svelte.js";

import type { AutumnConvexApi, Customer } from "../svelte/types.js";
import type { AutumnServerState } from "./client.svelte.js";

/**
 * Initialize Autumn for SvelteKit with SSR support.
 *
 * This function sets up Autumn billing integration for your SvelteKit application.
 * It should be called in your root layout component (+layout.svelte).
 *
 * @param convexApi - The Autumn API from your Convex backend (e.g., api.autumn)
 * @param getServerState - Optional function to get server-side customer data for SSR
 * @returns The Autumn client instance that can be used to access billing methods
 *
 * @example
 * ```svelte
 * <!-- +layout.svelte -->
 * <script lang="ts">
 *   import { setupAutumn } from '@stickerdaniel/convex-autumn-svelte/autumn/sveltekit';
 *   import { api } from '$lib/convex/_generated/api';
 *   import type { LayoutData } from './$types';
 *
 *   let { data }: { data: LayoutData } = $props();
 *
 *   // Set up Autumn with SSR support
 *   setupAutumn({
 *     convexApi: api.autumn,
 *     getServerState: () => data.autumnState
 *   });
 * </script>
 *
 * <slot />
 * ```
 *
 * In your +layout.server.ts:
 * ```typescript
 * import type { LayoutServerLoad } from './$types';
 * import { createAutumnHandlers } from '@stickerdaniel/convex-autumn-svelte/autumn/sveltekit/server';
 *
 * export const load: LayoutServerLoad = async (event) => {
 *   const { getCustomer } = createAutumnHandlers();
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
 */
export function setupAutumn({
	convexApi,
	getServerState,
}: {
	/** Autumn Convex API object (e.g., api.autumn from generated types) */
	convexApi: AutumnConvexApi;
	/** Optional function to get server state for SSR hydration */
	getServerState?: () => AutumnServerState;
}) {
	const autumn = createAutumnClientSvelteKit({ convexApi, getServerState });
	setAutumnContext(autumn);

	return autumn;
}

/**
 * Hook for accessing customer data and Autumn billing operations in SvelteKit.
 *
 * Must be called after `setupAutumn()` has been called in a parent component.
 *
 * Note: Customer data is pre-loaded server-side via SSR and automatically
 * refreshed after mutations using SvelteKit's `invalidateAll()`. No global
 * loading state is needed since data is always available on initial render.
 *
 * @returns Customer data and billing methods
 * @returns {Customer | null} customer - Customer data (pre-loaded via SSR, null if not found)
 * @returns {function(CheckParams): LocalCheckResult} allowed - Local check for feature access without consuming usage
 * @returns {function(CheckParams): Promise<CheckResult>} check - Server-side check with usage tracking (auto-invalidates)
 * @returns {function(CheckoutParams): Promise<{url?: string}>} checkout - Initiate checkout for a product (auto-invalidates)
 * @returns {function(TrackParams): Promise<TrackResult>} track - Track usage of a feature (auto-invalidates)
 * @returns {function(AttachParams): Promise<void>} attach - Attach a product to the customer (auto-invalidates)
 * @returns {function(CancelParams): Promise<void>} cancel - Cancel a product subscription (auto-invalidates)
 * @returns {function(BillingPortalParams): Promise<BillingPortalResult>} openBillingPortal - Open Stripe billing portal
 * @returns {function(CreateEntityParams): Promise<Entity>} createEntity - Create a new entity (auto-invalidates)
 * @returns {function(GetEntityParams): Promise<Entity>} getEntity - Get entity by ID
 * @returns {function(SetupPaymentParams): Promise<SetupPaymentResult>} setupPayment - Setup payment method without charging (auto-invalidates)
 * @returns {function(CreateReferralCodeParams): Promise<CreateReferralCodeResult>} createReferralCode - Create a referral code (auto-invalidates)
 * @returns {function(RedeemReferralCodeParams): Promise<RedeemReferralCodeResult>} redeemReferralCode - Redeem a referral code for rewards (auto-invalidates)
 * @returns {function(): Promise<Product[]>} listProducts - List all available products
 * @returns {function(SetUsageParams): Promise<SetUsageResult>} usage - Set usage to an absolute value (not a query - use customer.features for reading)
 * @returns {function(QueryParams): Promise<QueryResult>} query - Query customer data with custom parameters
 * @returns {function(): Promise<void>} refetch - Manually trigger SvelteKit data refresh (invalidateAll)
 *
 * @example
 * ```svelte
 * <!-- Basic usage with SSR-provided customer data -->
 * <script lang="ts">
 *   import { useCustomer } from "@stickerdaniel/convex-autumn-svelte/autumn/sveltekit";
 *
 *   const { customer, allowed, checkout } = useCustomer();
 *
 *   // No loading state needed - customer data pre-loaded via SSR!
 *   const canUpload = $derived(allowed({ featureId: 'uploads' }).allowed);
 * </script>
 *
 * {#if customer}
 *   <p>Welcome {customer.name}!</p>
 *   <p>Messages: {customer.features?.messages?.balance}</p>
 *   {#if !canUpload}
 *     <button onclick={() => checkout({ productId: 'pro' })}>
 *       Upgrade to enable uploads
 *     </button>
 *   {/if}
 * {/if}
 * ```
 *
 * @example
 * ```svelte
 * <!-- Payment setup and referral codes with auto-refresh -->
 * <script lang="ts">
 *   import { useCustomer } from "@stickerdaniel/convex-autumn-svelte/autumn/sveltekit";
 *
 *   const { setupPayment, createReferralCode, redeemReferralCode } = useCustomer();
 *
 *   async function addPaymentMethod() {
 *     // Automatically calls invalidateAll() after completion
 *     await setupPayment({ successUrl: '/dashboard' });
 *   }
 *
 *   async function generateReferralCode() {
 *     // Automatically refreshes customer data after creation
 *     const { code } = await createReferralCode({ programId: 'friends' });
 *     alert(`Your referral code: ${code}`);
 *   }
 *
 *   async function redeemCode(code: string) {
 *     // Automatically refreshes customer data after redemption
 *     const { success, reward } = await redeemReferralCode({ code });
 *     if (success) {
 *       alert('Reward received! Customer data refreshed.');
 *     }
 *   }
 * </script>
 *
 * <button onclick={addPaymentMethod}>Add Payment Method</button>
 * <button onclick={generateReferralCode}>Generate Referral Code</button>
 * ```
 *
 * @example
 * ```svelte
 * <!-- Product listing and usage queries -->
 * <script lang="ts">
 *   import { useCustomer } from "@stickerdaniel/convex-autumn-svelte/autumn/sveltekit";
 *
 *   const { listProducts, usage, query, track } = useCustomer();
 *
 *   let products = $state<Product[]>([]);
 *   let setUsageResult = $state<SetUsageResult | null>(null);
 *
 *   async function loadPricing() {
 *     products = await listProducts();
 *   }
 *
 *   async function resetUsage() {
 *     setUsageResult = await usage({ featureId: 'messages', value: 0 });
 *   }
 *
 *   async function queryLastMonth() {
 *     const data = await query({ featureId: 'messages', range: '30d' });
 *     console.log('Last 30 days:', data);
 *   }
 *
 *   async function sendMessage() {
 *     // Track automatically calls invalidateAll() to refresh customer data
 *     await track({ featureId: 'messages', value: 1 });
 *   }
 * </script>
 *
 * <button onclick={loadPricing}>Show Pricing</button>
 * <button onclick={resetUsage}>Reset Usage to 0</button>
 * <button onclick={sendMessage}>Send Message</button>
 *
 * <!-- Access usage from customer.features instead -->
 * {#if customer?.features?.messages}
 *   <p>Usage: {customer.features.messages.usage} / {customer.features.messages.included_usage}</p>
 * {/if}
 * ```
 */
export function useCustomer() {
	const autumn = getAutumnContext();

	if (!autumn) {
		throw new Error(
			"No Autumn client found in context. Did you forget to call setupAutumn()?",
		);
	}

	return {
		get customer() {
			return autumn.customer;
		},

		allowed: autumn.allowed,

		check: autumn.check,
		checkout: autumn.checkout,
		track: autumn.track,
		attach: autumn.attach,
		cancel: autumn.cancel,
		openBillingPortal: autumn.openBillingPortal,
		createEntity: autumn.createEntity,
		getEntity: autumn.getEntity,
		setupPayment: autumn.setupPayment,
		createReferralCode: autumn.createReferralCode,
		redeemReferralCode: autumn.redeemReferralCode,
		listProducts: autumn.listProducts,
		usage: autumn.usage,
		query: autumn.query,
		refetch: autumn.refetch,
	};
}

/**
 * Check if Autumn has been set up in the current context
 */
export function isAutumnSetup(): boolean {
	return hasAutumnContext();
}

/**
 * Helper for managing loading, error, and result state for Autumn operations.
 *
 * Reduces boilerplate when calling async billing operations like checkout, track, etc.
 * Returns reactive state ($state runes) that automatically updates during operation execution.
 *
 * @see {@link useAutumnOperation} for detailed documentation and examples
 */
export { useAutumnOperation } from "./client.svelte.js";

// Re-export types for convenience
export type {
	Customer,
	Entity,
	Feature,
	Product,
	ProductItem,
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
	LocalCheckResult,
	RefetchOptions,
	AutumnConvexApi,
} from "../svelte/types.js";

export type { AutumnServerState } from "./client.svelte.js";
