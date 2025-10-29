/**
 * Svelte implementation of Autumn billing client.
 *
 * Uses manual state management with Convex Actions for data fetching.
 * The createCustomer action calls external APIs and is not reactive like queries.
 */

import { getContext, setContext } from "svelte";
import { useConvexClient } from "convex-svelte";

import type {
	AutumnConvexApi,
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
	LocalCheckResult,
	RefetchOptions,
} from "./types.js";
import { unwrapAutumnResponse } from "./types.js";
import { isBrowser } from "./utils.js";

const AUTUMN_CONTEXT_KEY = "$$_autumn";

/**
 * Creates an Autumn billing client with Svelte reactivity.
 *
 * Provides reactive access to customer data and methods for interacting with
 * Autumn billing features including subscriptions, usage tracking, and checkout.
 *
 * @param options - Configuration object
 * @param options.convexApi - The Autumn Convex API to use for actions
 * @returns Autumn client API with reactive customer data and action methods
 * @example
 * ```ts
 * const autumn = createAutumnClient({ convexApi });
 * console.log(autumn.customer?.email);
 * await autumn.checkout({ productId: 'prod_123' });
 * ```
 */
export function createAutumnClient({
	convexApi,
}: {
	convexApi: AutumnConvexApi;
}) {
	const client = useConvexClient();

	// Actions call external APIs and cannot use reactive queries.
	const customerState = $state<{
		data: Customer | null | undefined;
		isLoading: boolean;
		error: Error | null | undefined;
	}>({
		data: undefined,
		isLoading: true,
		error: null,
	});

	async function fetchCustomer() {
		customerState.isLoading = true;
		customerState.error = null;

		try {
			const result = await client.action(convexApi.createCustomer, {
				expand: {},
				errorOnNotFound: false,
			});
			customerState.data = unwrapAutumnResponse<Customer | null>(result);
		} catch (err) {
			customerState.error = err instanceof Error ? err : new Error(String(err));
			customerState.data = null;
		} finally {
			customerState.isLoading = false;
		}
	}

	fetchCustomer();

	/**
	 * Performs client-side feature access check without consuming usage.
	 *
	 * @param params - Check parameters including featureId and requiredBalance
	 * @returns Check result indicating if access is allowed and reason if not
	 */
	const allowed = (params: CheckParams): LocalCheckResult => {
		const customer = customerState.data;

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
	 * Checks feature access on server and tracks usage.
	 *
	 * @param params - Check parameters including featureId and usage amount
	 * @param options - Options controlling data refetch behavior
	 * @returns Promise resolving to check result with allowed status
	 */
	const check = async (
		params: CheckParams,
		options: RefetchOptions = {},
	): Promise<CheckResult> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.check, params);
		const response = unwrapAutumnResponse<CheckResult>(result);

		if (refetch) {
			await fetchCustomer();
		}

		return response;
	};

	/**
	 * Initiates checkout flow for a product or subscription.
	 *
	 * @param params - Checkout parameters including productId and optional dialog handler
	 * @param options - Options controlling data refetch behavior
	 * @returns Promise resolving to checkout result with optional URL
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
			await fetchCustomer();
		}

		return data;
	};

	/**
	 * Tracks usage of a feature and decrements balance.
	 *
	 * @param params - Track parameters including featureId and usage amount
	 * @param options - Options controlling data refetch behavior
	 * @returns Promise resolving to track result with success status
	 */
	const track = async (
		params: TrackParams,
		options: RefetchOptions = {},
	): Promise<TrackResult> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.track, params);
		const response = unwrapAutumnResponse<TrackResult>(result);

		if (refetch) {
			await fetchCustomer();
		}

		return response;
	};

	/**
	 * Attaches a product subscription to the customer.
	 *
	 * @param params - Attach parameters including productId
	 * @param options - Options controlling data refetch behavior
	 * @returns Promise that resolves when attachment completes
	 */
	const attach = async (
		params: AttachParams,
		options: RefetchOptions = {},
	): Promise<void> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.attach, params);
		unwrapAutumnResponse<void>(result);

		if (refetch) {
			await fetchCustomer();
		}
	};

	/**
	 * Cancels a product subscription for the customer.
	 *
	 * @param params - Cancel parameters including productId
	 * @param options - Options controlling data refetch behavior
	 * @returns Promise that resolves when cancellation completes
	 */
	const cancel = async (
		params: CancelParams,
		options: RefetchOptions = {},
	): Promise<void> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.cancel, params);
		unwrapAutumnResponse<void>(result);

		if (refetch) {
			await fetchCustomer();
		}
	};

	/**
	 * Opens the Stripe billing portal in a new window.
	 *
	 * @param params - Billing portal parameters (optional)
	 * @returns Promise resolving to billing portal result with URL
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
	 * Creates a new entity for multi-tenant billing scenarios.
	 *
	 * @param params - Entity creation parameters
	 * @param options - Options controlling data refetch behavior
	 * @returns Promise resolving to the created entity
	 */
	const createEntity = async (
		params: CreateEntityParams,
		options: RefetchOptions = {},
	): Promise<Entity> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.createEntity, params);
		const entity = unwrapAutumnResponse<Entity>(result);

		if (refetch) {
			await fetchCustomer();
		}

		return entity;
	};

	/**
	 * Retrieves an entity by its ID.
	 *
	 * @param params - Parameters including the entity ID
	 * @returns Promise resolving to the entity
	 */
	const getEntity = async (params: GetEntityParams): Promise<Entity> => {
		const result = await client.action(convexApi.getEntity, params);
		return unwrapAutumnResponse<Entity>(result);
	};

	/**
	 * Sets up payment method without charging immediately.
	 *
	 * @param params - Setup payment parameters (optional)
	 * @param options - Options controlling data refetch behavior
	 * @returns Promise resolving to setup result with URL
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
			await fetchCustomer();
		}

		return data;
	};

	/**
	 * Creates a referral code for the customer.
	 *
	 * @param params - Referral code creation parameters
	 * @param options - Options controlling data refetch behavior
	 * @returns Promise resolving to created referral code result
	 */
	const createReferralCode = async (
		params: CreateReferralCodeParams,
		options: RefetchOptions = {},
	): Promise<CreateReferralCodeResult> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.createReferralCode, params);
		const data = unwrapAutumnResponse<CreateReferralCodeResult>(result);

		if (refetch) {
			await fetchCustomer();
		}

		return data;
	};

	/**
	 * Redeems a referral code and applies rewards.
	 *
	 * @param params - Referral code redemption parameters
	 * @param options - Options controlling data refetch behavior
	 * @returns Promise resolving to redemption result
	 */
	const redeemReferralCode = async (
		params: RedeemReferralCodeParams,
		options: RefetchOptions = {},
	): Promise<RedeemReferralCodeResult> => {
		const { refetch = true } = options;

		const result = await client.action(convexApi.redeemReferralCode, params);
		const data = unwrapAutumnResponse<RedeemReferralCodeResult>(result);

		if (refetch) {
			await fetchCustomer();
		}

		return data;
	};

	/**
	 * Lists all available products.
	 *
	 * @returns Promise resolving to array of products
	 */
	const listProducts = async (): Promise<Product[]> => {
		const result = await client.action(convexApi.listProducts, {});
		const data = unwrapAutumnResponse<{ list: Product[] }>(result);
		return data.list;
	};

	/**
	 * Sets usage to an absolute value for syncing external usage data.
	 *
	 * Unlike track which increments, this sets the exact usage value.
	 *
	 * @param params - Usage parameters including featureId and value
	 * @returns Promise resolving to success result
	 */
	const usage = async (params: SetUsageParams): Promise<SetUsageResult> => {
		const result = await client.action(convexApi.usage, params);
		return unwrapAutumnResponse<SetUsageResult>(result);
	};

	/**
	 * Queries customer data with custom parameters.
	 *
	 * @param params - Query parameters for filtering customer data
	 * @returns Promise resolving to query result
	 */
	const query = async (params: QueryParams): Promise<QueryResult> => {
		const result = await client.action(convexApi.query, params);
		return unwrapAutumnResponse<QueryResult>(result);
	};

	const autumnApi = {
		get customer(): Customer | null | undefined {
			return customerState.data;
		},
		get isLoading(): boolean {
			return customerState.isLoading;
		},
		get error(): Error | null | undefined {
			return customerState.error;
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

		refetch: fetchCustomer,
	};

	return autumnApi;
}

/**
 * Sets the Autumn client in Svelte context.
 *
 * @param autumnClient - The Autumn client instance to set in context
 * @returns The client instance
 */
export function setAutumnContext(
	autumnClient: ReturnType<typeof createAutumnClient>,
) {
	setContext(AUTUMN_CONTEXT_KEY, autumnClient);
	return autumnClient;
}

/**
 * Retrieves the Autumn client from Svelte context.
 *
 * @returns The Autumn client instance
 */
export function getAutumnContext() {
	return getContext<ReturnType<typeof createAutumnClient>>(
		AUTUMN_CONTEXT_KEY,
	);
}

/**
 * Checks if Autumn client exists in context.
 *
 * @returns True if Autumn client is available in context
 */
export function hasAutumnContext(): boolean {
	try {
		return !!getContext(AUTUMN_CONTEXT_KEY);
	} catch {
		return false;
	}
}
