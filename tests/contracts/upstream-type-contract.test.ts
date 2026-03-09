import { describe, expect, test } from "vitest";

import { api } from "../../src/lib/convex/_generated/api.js";
import type {
	AttachParams,
	AutumnConvexApi,
	BillingPortalParams,
	CancelParams,
	CheckParams,
	CheckoutParams,
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

describe("upstream type contract", () => {
	test("generated api.autumn remains assignable to AutumnConvexApi", () => {
		const autumnApi: AutumnConvexApi = api.autumn;
		expect(Boolean(autumnApi)).toBe(true);
	});

	test("wrapper parameter types remain compatible with installed upstream args", () => {
		expect(true).toBe(true);
	});
});
