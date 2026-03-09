import type { AutumnConvexApi } from "../../src/lib/svelte/types.js";

export const mockAutumnApi = {
	createCustomer: "createCustomer",
	check: "check",
	checkout: "checkout",
	track: "track",
	attach: "attach",
	cancel: "cancel",
	billingPortal: "billingPortal",
	createEntity: "createEntity",
	getEntity: "getEntity",
	setupPayment: "setupPayment",
	createReferralCode: "createReferralCode",
	redeemReferralCode: "redeemReferralCode",
	listProducts: "listProducts",
	usage: "usage",
	query: "query",
} as unknown as AutumnConvexApi;
