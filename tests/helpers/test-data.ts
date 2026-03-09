import type {
	AutumnActionResponse,
	Customer,
	Entity,
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
