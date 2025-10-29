/**
 * SvelteKit-specific Autumn client with SSR support.
 *
 * Extends the vanilla Svelte client with SvelteKit features.
 */

import { getContext, setContext } from "svelte";
import { invalidate } from "$app/navigation";
import { useConvexClient } from "convex-svelte";

import type {
	AutumnConvexApi,
	Customer,
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
	Entity,
	LocalCheckResult,
	RefetchOptions,
} from "../svelte/types.js";
import { unwrapAutumnResponse } from "../svelte/types.js";
import { isBrowser } from "../svelte/utils.js";

const AUTUMN_CONTEXT_KEY = "$$_autumn_sveltekit";

/**
 * Server state for SSR hydration.
 */
export interface AutumnServerState {
	customer: Customer | null;
	_timeFetched: number;
}

/**
 * Create an Autumn client for SvelteKit with SSR support.
 *
 * @param params - Configuration options
 * @param params.convexApi - The Autumn Convex API object
 * @param params.getServerState - Optional function to retrieve server state
 * @returns The Autumn client API with reactive state and methods
 */
export function createAutumnClientSvelteKit({
	convexApi,
	getServerState,
}: {
	convexApi: AutumnConvexApi;
	getServerState?: () => AutumnServerState;
}) {
	const client = useConvexClient();

	// Wrap customer in container to enable Svelte reactivity tracking through property mutation.
	const _state = $state<{ customer: Customer | null }>({
		customer: getServerState?.()?.customer ?? null
	});

	// Sync customer data reactively from server state after invalidation.
	$effect(() => {
		const serverState = getServerState?.();

		if (serverState?.customer) {
			_state.customer = serverState.customer;
		} else {
			_state.customer = null;
		}
	});

	/**
	 * Performs client-side feature access check.
	 *
	 * @param params - Check parameters including featureId and requiredBalance
	 * @returns Local check result indicating whether access is allowed
	 */
	const allowed = (params: CheckParams): LocalCheckResult => {
		const customer = _state.customer;

		if (!customer) {
			return { allowed: false, reason: "No customer data" };
		}

		const { featureId, requiredBalance = 1 } = params;
		const feature = customer.features?.[featureId];

		if (!feature) {
			return { allowed: false, reason: "Feature not found" };
		}

		if (feature.balance !== undefined && feature.balance < requiredBalance) {
			return {
				allowed: false,
				reason: `Insufficient balance: ${feature.balance} < ${requiredBalance}`,
			};
		}

		return { allowed: true };
	};

	/**
	 * Check feature access with server-side validation and usage tracking.
	 *
	 * @param params - Check parameters including featureId and requiredBalance
	 * @param options - Options including whether to refetch customer data
	 * @returns Check result from the server
	 */
	const check = async (
		params: CheckParams,
		options: RefetchOptions = {},
	): Promise<CheckResult> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.check, params);
		const response = unwrapAutumnResponse<CheckResult>(result);

		if (refetch) {
			await invalidate('autumn:customer');
		}

		return response;
	};

	/**
	 * Initiate checkout flow.
	 *
	 * @param params - Checkout parameters including productId and optional dialog
	 * @param options - Options including whether to refetch customer data
	 * @returns Object containing the checkout URL
	 */
	const checkout = async (
		params: CheckoutParams,
		options: RefetchOptions = {},
	): Promise<{ url?: string }> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.checkout, params);
		const data = unwrapAutumnResponse<{ url?: string }>(result);

		if (params.dialog && data.url) {
			if (isBrowser) {
				params.dialog(data.url);
			}
		}

		if (refetch) {
			await invalidate('autumn:customer');
		}

		return data;
	};

	/**
	 * Track usage of a feature.
	 *
	 * @param params - Track parameters including featureId and amount
	 * @param options - Options including whether to refetch customer data
	 * @returns Track result from the server
	 */
	const track = async (
		params: TrackParams,
		options: RefetchOptions = {},
	): Promise<TrackResult> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.track, params);
		const data = unwrapAutumnResponse<TrackResult>(result);

		if (refetch) {
			await invalidate('autumn:customer');
		}

		return data;
	};

	/**
	 * Attach a product to the customer.
	 *
	 * @param params - Attach parameters including productId
	 * @param options - Options including whether to refetch customer data
	 */
	const attach = async (
		params: AttachParams,
		options: RefetchOptions = {},
	): Promise<void> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.attach, params);
		unwrapAutumnResponse<void>(result);

		if (refetch) {
			await invalidate('autumn:customer');
		}
	};

	/**
	 * Cancel a product subscription.
	 *
	 * @param params - Cancel parameters including productId
	 * @param options - Options including whether to refetch customer data
	 */
	const cancel = async (
		params: CancelParams,
		options: RefetchOptions = {},
	): Promise<void> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.cancel, params);
		unwrapAutumnResponse<void>(result);

		if (refetch) {
			await invalidate('autumn:customer');
		}
	};

	/**
	 * Open the billing portal.
	 *
	 * @param params - Optional billing portal parameters
	 * @returns Object containing the billing portal URL
	 */
	const openBillingPortal = async (
		params: BillingPortalParams = {},
	): Promise<BillingPortalResult> => {
		const result = await client.action(convexApi.billingPortal, params);
		const data = unwrapAutumnResponse<BillingPortalResult>(result);

		if (isBrowser && data.url) {
			window.open(data.url, "_blank");
		}

		return data;
	};

	/**
	 * Create a new entity.
	 *
	 * @param params - Entity creation parameters including name and type
	 * @param options - Options including whether to refetch customer data
	 * @returns The created entity
	 */
	const createEntity = async (
		params: CreateEntityParams,
		options: RefetchOptions = {},
	): Promise<Entity> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.createEntity, params);
		const entity = unwrapAutumnResponse<Entity>(result);

		if (refetch) {
			await invalidate('autumn:customer');
		}

		return entity;
	};

	/**
	 * Get an entity by ID.
	 *
	 * @param params - Parameters including the entity ID
	 * @returns The requested entity
	 */
	const getEntity = async (params: GetEntityParams): Promise<Entity> => {
		const result = await client.action(convexApi.getEntity, params);
		return unwrapAutumnResponse<Entity>(result);
	};

	/**
	 * Setup payment method without immediate charge.
	 *
	 * @param params - Optional setup payment parameters
	 * @param options - Options including whether to refetch customer data
	 * @returns Object containing the setup payment URL
	 */
	const setupPayment = async (
		params: SetupPaymentParams = {},
		options: RefetchOptions = {},
	): Promise<SetupPaymentResult> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.setupPayment, params);
		const data = unwrapAutumnResponse<SetupPaymentResult>(result);

		if (isBrowser && data.url) {
			window.location.href = data.url;
		}

		if (refetch) {
			await invalidate('autumn:customer');
		}

		return data;
	};

	/**
	 * Create a referral code.
	 *
	 * @param params - Referral code creation parameters
	 * @param options - Options including whether to refetch customer data
	 * @returns Object containing the created referral code
	 */
	const createReferralCode = async (
		params: CreateReferralCodeParams,
		options: RefetchOptions = {},
	): Promise<CreateReferralCodeResult> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.createReferralCode, params);
		const data = unwrapAutumnResponse<CreateReferralCodeResult>(result);

		if (refetch) {
			await invalidate('autumn:customer');
		}

		return data;
	};

	/**
	 * Redeem a referral code.
	 *
	 * @param params - Referral code redemption parameters including the code
	 * @param options - Options including whether to refetch customer data
	 * @returns Object containing the redemption result
	 */
	const redeemReferralCode = async (
		params: RedeemReferralCodeParams,
		options: RefetchOptions = {},
	): Promise<RedeemReferralCodeResult> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.redeemReferralCode, params);
		const data = unwrapAutumnResponse<RedeemReferralCodeResult>(result);

		if (refetch) {
			await invalidate('autumn:customer');
		}

		return data;
	};

	/**
	 * List all available products.
	 *
	 * @returns Array of available products
	 */
	const listProducts = async (): Promise<Product[]> => {
		const result = await client.action(convexApi.listProducts, {});
		const data = unwrapAutumnResponse<{ list: Product[] }>(result);
		return data.list;
	};

	/**
	 * Set usage to an absolute value.
	 *
	 * Use this to sync external usage data or reset usage to a specific value.
	 *
	 * @param params - Usage parameters including featureId and value
	 * @returns Result of the usage update
	 */
	const usage = async (params: SetUsageParams): Promise<SetUsageResult> => {
		const result = await client.action(convexApi.usage, params);
		return unwrapAutumnResponse<SetUsageResult>(result);
	};

	/**
	 * Query customer data with custom parameters.
	 *
	 * @param params - Query parameters
	 * @returns Query result data
	 */
	const query = async (params: QueryParams): Promise<QueryResult> => {
		const result = await client.action(convexApi.query, params);
		return unwrapAutumnResponse<QueryResult>(result);
	};

	/**
	 * Manually refetch customer data.
	 *
	 * Uses SvelteKit's targeted invalidation for efficient refresh.
	 */
	const refetch = async (): Promise<void> => {
		await invalidate('autumn:customer');
	};

	const autumnApi = {
		// Use getter to enable Svelte reactivity tracking when reading customer state.
		get customer(): Customer | null {
			return _state.customer;
		},

		allowed,
		check,
		checkout,
		track,
		attach,
		cancel,
		openBillingPortal,
		createEntity,
		getEntity,
		setupPayment,
		createReferralCode,
		redeemReferralCode,
		listProducts,
		usage,
		query,
		refetch,
	};

	return autumnApi;
}

/**
 * Set the Autumn client in the context.
 *
 * @param autumnClient - The Autumn client instance
 * @returns The Autumn client instance
 */
export function setAutumnContext(
	autumnClient: ReturnType<typeof createAutumnClientSvelteKit>,
) {
	setContext(AUTUMN_CONTEXT_KEY, autumnClient);
	return autumnClient;
}

/**
 * Get the Autumn client from the context.
 *
 * @returns The Autumn client instance from context
 */
export function getAutumnContext() {
	return getContext<ReturnType<typeof createAutumnClientSvelteKit>>(
		AUTUMN_CONTEXT_KEY,
	);
}

/**
 * Check if Autumn has been set up.
 *
 * @returns True if the Autumn context exists
 */
export function hasAutumnContext(): boolean {
	try {
		return !!getContext(AUTUMN_CONTEXT_KEY);
	} catch {
		return false;
	}
}

/**
 * Creates reactive state for an Autumn operation with loading, error, and result tracking.
 *
 * This helper reduces boilerplate for managing loading states, error handling, and results
 * when calling Autumn billing operations. Perfect for operations triggered by user actions
 * like checkout, track, attach, etc.
 *
 * @template TParams - The parameters type for the operation
 * @template TResult - The result type returned by the operation
 * @param operation - The Autumn operation function to wrap (e.g., autumn.checkout)
 * @param defaultOptions - Default RefetchOptions to use for all executions
 * @returns Object with execute function and reactive state (isLoading, error, result, reset)
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useCustomer, useAutumnOperation } from '$lib/sveltekit';
 *
 *   const autumn = useCustomer();
 *
 *   // Simple usage - auto-refetch enabled
 *   const upgrade = useAutumnOperation(autumn.checkout);
 *
 *   async function handleUpgrade() {
 *     const result = await upgrade.execute({ productId: 'pro' });
 *     if (result?.url) {
 *       window.location.href = result.url;
 *     }
 *   }
 * </script>
 *
 * <button disabled={upgrade.isLoading} onclick={handleUpgrade}>
 *   {upgrade.isLoading ? 'Processing...' : 'Upgrade to Pro'}
 * </button>
 *
 * {#if upgrade.error}
 *   <p class="error">{upgrade.error.message}</p>
 * {/if}
 * ```
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useCustomer, useAutumnOperation } from '$lib/sveltekit';
 *
 *   const autumn = useCustomer();
 *   const checkout = useAutumnOperation(autumn.checkout);
 *
 *   async function handleCheckout() {
 *     const result = await checkout.execute({ productId: 'pro' });
 *     if (result?.url) window.location.href = result.url;
 *   }
 * </script>
 *
 * {#if checkout.error}
 *   <div class="error">
 *     {checkout.error.message}
 *     <button onclick={() => checkout.reset()}>Dismiss</button>
 *   </div>
 * {/if}
 *
 * <button disabled={checkout.isLoading} onclick={handleCheckout}>
 *   {checkout.isLoading ? 'Processing...' : 'Upgrade'}
 * </button>
 * ```
 *
 * @example
 * ```svelte
 * <!-- Override default options per execution -->
 * <script lang="ts">
 *   import { useCustomer, useAutumnOperation } from '$lib/sveltekit';
 *
 *   const autumn = useCustomer();
 *
 *   // Default: refetch disabled
 *   const checkout = useAutumnOperation(autumn.checkout, { refetch: false });
 *
 *   async function handleQuickCheckout() {
 *     // Override: enable refetch for this specific call
 *     await checkout.execute({ productId: 'basic' }, { refetch: true });
 *   }
 * </script>
 * ```
 */
export function useAutumnOperation<TParams, TResult>(
	operation: (params: TParams, options?: RefetchOptions) => Promise<TResult>,
	defaultOptions?: RefetchOptions,
) {
	let isLoading = $state(false);
	let error = $state<Error | null>(null);
	let result = $state<TResult | null>(null);

	async function execute(
		params: TParams,
		executeOptions?: RefetchOptions,
	): Promise<TResult | null> {
		isLoading = true;
		error = null;

		try {
			// Merge execute options with default options (execute options take precedence)
			const mergedOptions = { ...defaultOptions, ...executeOptions };
			const operationResult = await operation(params, mergedOptions);
			result = operationResult;
			return operationResult;
		} catch (err) {
			error = err instanceof Error ? err : new Error(String(err));
			result = null;
			return null;
		} finally {
			isLoading = false;
		}
	}

	function reset() {
		isLoading = false;
		error = null;
		result = null;
	}

	return {
		execute,
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		},
		get result() {
			return result;
		},
		reset,
	};
}
