/**
 * TypeScript types for Autumn billing integration.
 *
 * Type definitions adapted from autumn-js React implementation
 * for Svelte 5 reactive wrapper compatibility.
 */

import type { FunctionReference } from "convex/server";

/**
 * Represents a billable feature in Autumn.
 */
export interface Feature {
	id: string;
	name: string;
	type: "continuous_use" | "single_use";
	balance?: number;
	included_usage?: number;
	interval?: "month" | "year" | "one_time";
}

/**
 * Represents a pricing plan or product.
 */
export interface Product {
	id: string;
	name: string;
	description?: string;
	items: ProductItem[];
}

/**
 * Component of a product defining feature pricing and usage limits.
 */
export interface ProductItem {
	feature_id?: string;
	included_usage?: number;
	price?: number;
	interval?: "month" | "year" | "one_time";
}

/**
 * Represents an entity for entity-based billing scenarios.
 */
export interface Entity {
	id: string;
	name: string;
	feature_id?: string;
	balance?: number;
	included_usage?: number;
	created_at?: number;
}

/**
 * Represents a customer with billing information and subscriptions.
 */
export interface Customer {
	id: string;
	name?: string;
	email?: string;
	products?: Product[];
	features?: Record<string, Feature>;
	entities?: Entity[];
	stripe_customer_id?: string;
	created_at?: number;
	updated_at?: number;
}

/**
 * Parameters for checking feature access.
 */
export interface CheckParams {
	featureId: string;
	productId?: string;
	requiredBalance?: number;
	entityId?: string;
	[key: string]: unknown;
}

/**
 * Result of checking feature access.
 */
export interface CheckResult {
	allowed: boolean;
	balance?: number;
	reason?: string;
}

/**
 * Parameters for initiating checkout.
 */
export interface CheckoutParams {
	productId: string;
	dialog?: (url: string) => void;
	successUrl?: string;
	[key: string]: unknown;
}

/**
 * Parameters for tracking usage.
 */
export interface TrackParams {
	featureId: string;
	value: number;
	entityId?: string;
	[key: string]: unknown;
}

/**
 * Result of tracking usage.
 */
export interface TrackResult {
	success: boolean;
	balance?: number;
	error?: string;
}

/**
 * Parameters for attaching a product.
 */
export interface AttachParams {
	productId: string;
	[key: string]: unknown;
}

/**
 * Parameters for canceling a subscription.
 */
export interface CancelParams {
	productId: string;
	[key: string]: unknown;
}

/**
 * Parameters for opening the billing portal.
 */
export interface BillingPortalParams {
	returnUrl?: string;
	[key: string]: unknown;
}

/**
 * Result of opening billing portal.
 */
export interface BillingPortalResult {
	url: string;
}

/**
 * Parameters for creating an entity.
 */
export interface CreateEntityParams {
	id: string;
	name: string;
	featureId?: string;
	[key: string]: unknown;
}

/**
 * Parameters for getting an entity.
 */
export interface GetEntityParams {
	entityId: string;
	expand?: ("invoices")[];
	[key: string]: unknown;
}

/**
 * Parameters for setting up payment method.
 */
export interface SetupPaymentParams {
	successUrl?: string;
	checkoutSessionParams?: Record<string, unknown>;
	[key: string]: unknown;
}

/**
 * Result of setting up payment method.
 */
export interface SetupPaymentResult {
	url: string;
}

/**
 * Parameters for creating a referral code.
 */
export interface CreateReferralCodeParams {
	programId: string;
	[key: string]: unknown;
}

/**
 * Result of creating a referral code.
 */
export interface CreateReferralCodeResult {
	code: string;
	program_id: string;
}

/**
 * Parameters for redeeming a referral code.
 */
export interface RedeemReferralCodeParams {
	code: string;
	[key: string]: unknown;
}

/**
 * Result of redeeming a referral code.
 */
export interface RedeemReferralCodeResult {
	success: boolean;
	reward?: unknown;
}

/**
 * Parameters for setting usage to an absolute value.
 *
 * Sets usage to the exact value provided, unlike track() which increments the current value.
 */
export interface SetUsageParams {
	featureId: string;
	value: number;
	entityId?: string;
	[key: string]: unknown;
}

/**
 * Result returned when setting usage to an absolute value.
 */
export interface SetUsageResult {
	success: boolean;
}

/**
 * Detailed feature usage data from the Customer object.
 *
 * Accessed via customer.features[featureId]. Not returned by standalone endpoints.
 */
export interface FeatureUsageData {
	id: string;
	name: string;
	type: 'continuous_use' | 'single_use';
	balance?: number;
	included_usage?: number;
	usage?: number;
	interval?: 'month' | 'year' | 'one_time';
	interval_count?: number;
	next_reset_at?: number;
	overage_allowed?: boolean;
	unlimited?: boolean;
}

/**
 * Parameters for querying customer data.
 */
export interface QueryParams {
	featureId: string | string[];
	range?: "24h" | "7d" | "30d" | "90d" | "last_cycle";
	[key: string]: unknown;
}

/**
 * Result of querying customer data.
 */
export interface QueryResult {
	data: Record<string, unknown>;
}

/**
 * Parameters for creating or getting a customer.
 */
export interface CreateCustomerParams {
	expand?: ("invoices" | "payment_method" | "rewards" | "trials_used" | "entities" | "referrals")[];
	errorOnNotFound?: boolean;
	[key: string]: unknown;
}

/**
 * Type definition for the Autumn Convex API surface.
 *
 * Matches Convex-generated types from api.autumn to enable direct assignment
 * without type casting. Uses FunctionReference<any, "public"> to align with
 * Convex code generation output.
 *
 * Runtime type safety is provided by unwrapAutumnResponse(), which validates
 * response structure and throws on errors. The index signature allows for
 * additional backend functions beyond the core set defined here.
 */
export interface AutumnConvexApi {
	createCustomer: FunctionReference<any, "public">;
	check: FunctionReference<any, "public">;
	checkout: FunctionReference<any, "public">;
	track: FunctionReference<any, "public">;
	attach: FunctionReference<any, "public">;
	cancel: FunctionReference<any, "public">;
	billingPortal: FunctionReference<any, "public">;
	createEntity: FunctionReference<any, "public">;
	getEntity: FunctionReference<any, "public">;
	setupPayment: FunctionReference<any, "public">;
	createReferralCode: FunctionReference<any, "public">;
	redeemReferralCode: FunctionReference<any, "public">;
	listProducts: FunctionReference<any, "public">;
	usage: FunctionReference<any, "public">;
	query: FunctionReference<any, "public">;
	[key: string]: FunctionReference<any, "public">;
}

/**
 * Return type for local feature access checks.
 */
export interface LocalCheckResult {
	allowed: boolean;
	reason?: string;
}

/**
 * Options for controlling automatic refetch behavior after mutations.
 */
export interface RefetchOptions {
	/**
	 * Whether to automatically refetch customer data after mutation.
	 *
	 * When true (default), customer data is automatically refreshed after the mutation completes,
	 * ensuring your UI stays in sync. Set to false for performance optimization in scenarios like:
	 * - Batch operations (disable for each, then manually refetch once)
	 * - Analytics tracking (UI doesn't depend on result)
	 * - Background operations (user doesn't need immediate feedback)
	 *
	 * @default true
	 * @example
	 * ```typescript
	 * // Default: auto-refetch enabled
	 * await track({ featureId: 'messages', value: 1 });
	 *
	 * // Opt-out: skip refetch for performance
	 * await track({ featureId: 'analytics', value: 1 }, { refetch: false });
	 *
	 * // Batch: disable auto-refetch, then manually refetch once
	 * await track({ featureId: 'messages', value: 1 }, { refetch: false });
	 * await track({ featureId: 'uploads', value: 1 }, { refetch: false });
	 * await refetch(); // Single refetch for all changes
	 * ```
	 */
	refetch?: boolean;
}

/**
 * Response wrapper for Autumn action results.
 *
 * All Autumn Convex actions return this discriminated union format.
 * Either data or error is set, never both.
 */
export type AutumnActionResponse<T> =
	| { data: T; error: null; statusCode?: number }
	| { data: null; error: {message: string; code: string}; statusCode?: number };

/**
 * Custom error class for Autumn API errors.
 *
 * Thrown when an Autumn action returns an error response.
 */
export class AutumnError extends Error {
	code: string;
	statusCode?: number;

	constructor(error: {message: string; code: string}, statusCode?: number) {
		super(error.message);
		this.name = "AutumnError";
		this.code = error.code;
		this.statusCode = statusCode;
	}
}

/**
 * Unwraps an Autumn action response with type narrowing and validation.
 *
 * @param response - The wrapped response from an Autumn action
 * @returns The unwrapped data
 * @throws {AutumnError} When the response contains an error
 * @throws {AutumnError} When the response data is null or undefined
 */
export function unwrapAutumnResponse<T>(
	response: AutumnActionResponse<T>,
): T {
	if (response.error) {
		throw new AutumnError(response.error, response.statusCode);
	}

	if (response.data === null || response.data === undefined) {
		throw new AutumnError(
			{message: "No data in response", code: "NO_DATA"},
			response.statusCode,
		);
	}

	return response.data;
}
