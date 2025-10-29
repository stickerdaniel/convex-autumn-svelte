/**
 * Svelte bindings for Autumn billing integration
 *
 * @module
 */

import {
	createAutumnClient,
	setAutumnContext,
	getAutumnContext,
	hasAutumnContext,
} from "./client.svelte.js";

import type { AutumnConvexApi } from "./types.js";

/**
 * Initialize Autumn for Svelte.
 *
 * This function sets up Autumn billing integration for your Svelte application.
 * It should be called in your root layout or App component.
 *
 * @param convexApi - The Autumn API from your Convex backend (e.g., api.autumn)
 * @returns The Autumn client instance that can be used to access billing methods
 * @example
 * ```svelte
 * <script>
 *   import { setupAutumn } from '@stickerdaniel/convex-autumn-svelte/autumn/svelte';
 *   import { api } from './convex/_generated/api';
 *
 *   // Set up Autumn
 *   setupAutumn({ convexApi: api.autumn });
 * </script>
 *
 * <!-- Your app content here -->
 * ```
 */
export function setupAutumn({
	convexApi,
}: {
	/** Autumn Convex API object (e.g., api.autumn from generated types) */
	convexApi: AutumnConvexApi;
}) {
	const autumn = createAutumnClient({ convexApi });
	setAutumnContext(autumn);
	return autumn;
}

/**
 * Hook for accessing customer data and Autumn billing operations.
 *
 * Must be called after `setupAutumn()` has been called in a parent component.
 *
 * Note: Customer data is fetched once on initialization and automatically
 * refreshed after mutations (checkout, track, attach, cancel, createEntity).
 * Use `refetch()` to manually refresh customer data.
 *
 * @returns Customer data and billing methods
 * @returns {Customer | null | undefined} customer - Customer data (null if not found, undefined if loading)
 * @returns {boolean} isLoading - Whether customer data is currently loading
 * @returns {Error | null | undefined} error - Error if customer fetch failed
 * @returns {function(CheckParams): LocalCheckResult} allowed - Local check for feature access without consuming usage
 * @returns {function(CheckParams): Promise<CheckResult>} check - Server-side check with usage tracking
 * @returns {function(CheckoutParams): Promise<{url?: string}>} checkout - Initiate checkout for a product
 * @returns {function(TrackParams): Promise<TrackResult>} track - Track usage of a feature
 * @returns {function(AttachParams): Promise<void>} attach - Attach a product to the customer
 * @returns {function(CancelParams): Promise<void>} cancel - Cancel a product subscription
 * @returns {function(BillingPortalParams): Promise<BillingPortalResult>} openBillingPortal - Open Stripe billing portal
 * @returns {function(CreateEntityParams): Promise<Entity>} createEntity - Create a new entity
 * @returns {function(GetEntityParams): Promise<Entity>} getEntity - Get entity by ID
 * @returns {function(SetupPaymentParams): Promise<SetupPaymentResult>} setupPayment - Setup payment method without charging
 * @returns {function(CreateReferralCodeParams): Promise<CreateReferralCodeResult>} createReferralCode - Create a referral code
 * @returns {function(RedeemReferralCodeParams): Promise<RedeemReferralCodeResult>} redeemReferralCode - Redeem a referral code for rewards
 * @returns {function(): Promise<Product[]>} listProducts - List all available products
 * @returns {function(SetUsageParams): Promise<SetUsageResult>} usage - Set usage to an absolute value (not a query - use customer.features for reading)
 * @returns {function(QueryParams): Promise<QueryResult>} query - Query customer data with custom parameters
 * @returns {function(): Promise<void>} refetch - Manually refresh customer data
 *
 * @example
 * ```svelte
 * <!-- Basic usage with feature checks and checkout -->
 * <script lang="ts">
 *   import { useCustomer } from "@stickerdaniel/convex-autumn-svelte/autumn/svelte";
 *
 *   const { customer, isLoading, error, allowed, checkout } = useCustomer();
 *
 *   const canUpload = $derived(allowed({ featureId: 'uploads' }).allowed);
 * </script>
 *
 * {#if isLoading}
 *   <p>Loading...</p>
 * {:else if error}
 *   <p>Error: {error.message}</p>
 * {:else if customer}
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
 * <!-- Payment setup and referral codes -->
 * <script lang="ts">
 *   import { useCustomer } from "@stickerdaniel/convex-autumn-svelte/autumn/svelte";
 *
 *   const { setupPayment, createReferralCode, redeemReferralCode } = useCustomer();
 *
 *   async function addPaymentMethod() {
 *     await setupPayment({ successUrl: '/dashboard' });
 *   }
 *
 *   async function generateReferralCode() {
 *     const { code } = await createReferralCode({ programId: 'friends' });
 *     alert(`Your referral code: ${code}`);
 *   }
 *
 *   async function redeemCode(code: string) {
 *     const { success, reward } = await redeemReferralCode({ code });
 *     if (success) {
 *       alert('Reward received!');
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
 * <!-- Product listing and reading usage data -->
 * <script lang="ts">
 *   import { useCustomer } from "@stickerdaniel/convex-autumn-svelte/autumn/svelte";
 *
 *   const { customer, listProducts, query, track } = useCustomer();
 *
 *   let products = $state<Product[]>([]);
 *
 *   // Access usage data from customer.features (reactive)
 *   const messagesFeature = $derived(customer?.features?.messages);
 *   const messagesUsed = $derived(
 *     messagesFeature?.included_usage && messagesFeature?.balance
 *       ? messagesFeature.included_usage - messagesFeature.balance
 *       : 0
 *   );
 *   const messagesTotal = $derived(messagesFeature?.included_usage ?? 0);
 *   const messagesRemaining = $derived(messagesFeature?.balance ?? 0);
 *
 *   async function loadPricing() {
 *     products = await listProducts();
 *   }
 *
 *   async function queryLastMonth() {
 *     const data = await query({ featureId: 'messages', range: '30d' });
 *     console.log('Last 30 days:', data);
 *   }
 *
 *   async function sendMessage() {
 *     await track({ featureId: 'messages', value: 1 });
 *     // Usage data updates automatically in customer.features
 *   }
 * </script>
 *
 * <button onclick={loadPricing}>Show Pricing</button>
 * <button onclick={queryLastMonth}>Query Analytics</button>
 * <button onclick={sendMessage}>Send Message</button>
 *
 * {#if messagesFeature}
 *   <p>Usage: {messagesUsed} / {messagesTotal} (Remaining: {messagesRemaining})</p>
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
		get isLoading() {
			return autumn.isLoading;
		},
		get error() {
			return autumn.error;
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
 * Check if Autumn has been set up in the current context.
 */
export function isAutumnSetup(): boolean {
	return hasAutumnContext();
}

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
	CreateCustomerParams,
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
	FeatureUsageData,
	QueryParams,
	QueryResult,
	LocalCheckResult,
	RefetchOptions,
	AutumnConvexApi,
	AutumnActionResponse,
} from "./types.js";

export { AutumnError, unwrapAutumnResponse } from "./types.js";
