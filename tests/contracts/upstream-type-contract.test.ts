import { describe, expect, test } from "vitest";

import { api } from "../../src/lib/convex/_generated/api.js";
import type {
	AttachResult as UpstreamAttachResult,
	CheckoutResult as UpstreamCheckoutResult,
} from "autumn-js";
import type { createAutumnClient } from "../../src/lib/svelte/client.svelte.js";
import type { createAutumnClientSvelteKit } from "../../src/lib/sveltekit/client.svelte.js";
import type {
	AttachParams,
	AttachResult,
	AutumnConvexApi,
	BillingPortalParams,
	CancelParams,
	CheckParams,
	CheckoutParams,
	CheckoutResult,
	CreateEntityParams,
	CreateReferralCodeParams,
	EventAggregateParams,
	EventListParams,
	GetEntityParams,
	QueryParams,
	RedeemReferralCodeParams,
	SetUsageParams,
	SetupPaymentParams,
	TrackParams,
} from "../../src/lib/svelte/types.js";
import type {
	AttachArgsType,
	BillingPortalArgsType,
	CancelArgsType,
	CheckArgsType,
	CheckoutArgsType,
	CreateEntityArgsType,
	CreateReferralCodeArgsType,
	EventAggregateArgsType,
	EventListArgsType,
	GetEntityArgsType,
	QueryArgsType,
	RedeemReferralCodeArgsType,
	SetupPaymentArgsType,
	TrackArgsType,
	UsageArgsType,
} from "../../node_modules/@useautumn/convex/src/types.js";

type ExpectExtends<T extends U, U> = true;
type ExpectApi<T extends AutumnConvexApi> = true;

type _autumnApiMatchesGenerated = ExpectApi<typeof api.autumn>;
type _checkParamsMatch = ExpectExtends<CheckParams, CheckArgsType>;
type _checkoutParamsMatch = ExpectExtends<CheckoutParams, CheckoutArgsType>;
type _trackParamsMatch = ExpectExtends<TrackParams, TrackArgsType>;
type _attachParamsMatch = ExpectExtends<AttachParams, AttachArgsType>;
type _cancelParamsMatch = ExpectExtends<CancelParams, CancelArgsType>;
type _billingPortalParamsMatch = ExpectExtends<
	BillingPortalParams,
	BillingPortalArgsType
>;
type _createEntityParamsMatch = ExpectExtends<
	CreateEntityParams,
	CreateEntityArgsType
>;
type _getEntityParamsMatch = ExpectExtends<GetEntityParams, GetEntityArgsType>;
type _setupPaymentParamsMatch = ExpectExtends<
	SetupPaymentParams,
	SetupPaymentArgsType
>;
type _createReferralCodeParamsMatch = ExpectExtends<
	CreateReferralCodeParams,
	CreateReferralCodeArgsType
>;
type _eventListParamsMatch = ExpectExtends<EventListParams, EventListArgsType>;
type _eventAggregateParamsMatch = ExpectExtends<
	EventAggregateParams,
	EventAggregateArgsType
>;
type _redeemReferralCodeParamsMatch = ExpectExtends<
	RedeemReferralCodeParams,
	RedeemReferralCodeArgsType
>;
type _setUsageParamsMatch = ExpectExtends<SetUsageParams, UsageArgsType>;
type _queryParamsMatch = ExpectExtends<QueryParams, QueryArgsType>;

// Result contracts. Both results are handed back untouched, so the exported
// types have to keep matching upstream's. The one deliberate deviation is
// `CheckoutResult.url`: upstream declares it `string | undefined` while the
// live API answers `null` for a purchase that needs in-app confirmation, so
// the wrapper widens exactly that field.
type _checkoutResultKeepsUpstreamShape = ExpectExtends<
	Omit<CheckoutResult, "url">,
	Omit<UpstreamCheckoutResult, "url">
>;
type _checkoutResultAllowsLiveNull = ExpectExtends<null, CheckoutResult["url"]>;
type _attachResultMatchesUpstream = ExpectExtends<
	AttachResult,
	UpstreamAttachResult
>;

// The methods must surface those results rather than a narrowed stand-in.
type _svelteCheckoutReturns = ExpectExtends<
	Awaited<ReturnType<ReturnType<typeof createAutumnClient>["checkout"]>>,
	CheckoutResult
>;
type _svelteAttachReturns = ExpectExtends<
	Awaited<ReturnType<ReturnType<typeof createAutumnClient>["attach"]>>,
	AttachResult
>;
type _svelteKitCheckoutReturns = ExpectExtends<
	Awaited<ReturnType<ReturnType<typeof createAutumnClientSvelteKit>["checkout"]>>,
	CheckoutResult
>;
type _svelteKitAttachReturns = ExpectExtends<
	Awaited<ReturnType<ReturnType<typeof createAutumnClientSvelteKit>["attach"]>>,
	AttachResult
>;

describe("upstream type contract", () => {
	test("generated api.autumn remains assignable to AutumnConvexApi", () => {
		const autumnApi: AutumnConvexApi = api.autumn;
		expect(Boolean(autumnApi)).toBe(true);
	});

	test("wrapper parameter types remain compatible with installed upstream args", () => {
		expect(true).toBe(true);
	});
});
