import { AppEnv } from "autumn-js";

import type {
	AttachResult,
	AutumnActionResponse,
	CheckoutResult,
	Customer,
	Entity,
	EventListResult,
	Product,
	QueryResult,
} from "../../src/lib/svelte/types.js";

export const freeCustomer: Customer = {
	id: "customer_free",
	email: "secret@secret.com",
	products: [{ id: "free", name: "Free", items: [] }],
	features: {
		messages: {
			id: "messages",
			name: "Messages",
			type: "single_use",
			usage: 1,
			balance: 9,
			included_usage: 10,
			interval: "month",
		},
	},
	entities: [],
};

export const proCustomer: Customer = {
	...freeCustomer,
	id: "customer_pro",
	products: [{ id: "pro", name: "Pro", items: [] }],
	features: {
		messages: {
			id: "messages",
			name: "Messages",
			type: "single_use",
			usage: 11,
			balance: 999999,
			included_usage: "inf",
			unlimited: true,
			interval: "month",
		},
	},
};

export const entity: Entity = {
	id: "e2e-entity-1",
	name: "Workspace",
	feature_id: "messages",
	balance: 3,
	included_usage: 10,
};

export const products: Product[] = [
	{ id: "free", name: "Free", items: [{ feature_id: "messages", included_usage: 10 }] },
	{ id: "pro", name: "Pro", items: [{ feature_id: "messages", included_usage: "inf" }] },
];

export const queryResult: QueryResult = {
	data: {
		list: [{ ts: 1, value: 1 }],
	},
};

export const eventListResult: EventListResult = {
	list: [
		{
			id: "evt_1",
			timestamp: 1_735_689_600,
			feature_id: "messages",
			customer_id: "customer_free",
			value: 1,
			properties: {},
		},
	],
	has_more: false,
	offset: 0,
	limit: 10,
	total: 1,
};

const autumnProduct = (id: string, name: string) => ({
	id,
	name,
	created_at: 1_735_689_600_000,
	env: AppEnv.Sandbox,
	is_add_on: false,
	is_default: id === "free",
	group: "main",
	version: 1,
	items: [],
	free_trial: null,
	base_variant_id: null,
	properties: {
		is_free: id === "free",
		is_one_off: false,
		interval_group: "month",
		has_trial: false,
		updateable: true,
	},
});

/**
 * A checkout answer that carries no hosted Stripe session.
 *
 * The live API returns `url: null` here, which Autumn's own declaration does
 * not model. Consumers have to read the preview and confirm it with `attach`,
 * so this pins the shape the wrapper must pass through untouched.
 */
export const checkoutPreview: CheckoutResult = {
	url: null,
	customer_id: "customer_free",
	has_prorations: false,
	lines: [{ description: "Pro - $10 / month", amount: 10, item: {} }],
	total: 10,
	currency: "usd",
	options: [{ feature_id: "seats", quantity: 3 }],
	product: autumnProduct("pro", "Pro"),
	current_product: autumnProduct("free", "Free"),
};

/** An attach answer that still needs a hosted page to collect payment. */
export const attachNeedsCheckout: AttachResult = {
	customer_id: "customer_free",
	product_ids: ["pro"],
	code: "checkout_created",
	message: "Payment required",
	checkout_url: "https://checkout.test/attach",
};

export function ok<T>(data: T): AutumnActionResponse<T> {
	return {
		data,
		error: null,
	};
}

export function fail(
	message = "Autumn failed",
	code = "AUTUMN_FAILED",
): AutumnActionResponse<never> {
	return {
		data: null as never,
		error: { message, code },
	};
}
