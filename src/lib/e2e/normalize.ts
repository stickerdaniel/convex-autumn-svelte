import type { Customer } from "../svelte/types.js";

export function normalizeCustomer(customer: Customer | null | undefined) {
	if (!customer) {
		return null;
	}

	const messages = customer.features?.messages;

	return {
		id: customer.id,
		email: customer.email ?? null,
		products: (customer.products ?? []).map((product) => product.id).sort(),
		messages: messages
			? {
					usage: messages.usage ?? null,
					balance: messages.balance ?? null,
					included_usage: messages.included_usage ?? null,
					unlimited: messages.unlimited ?? false,
				}
			: null,
		entities: (customer.entities ?? []).map((entity) => entity.id).sort(),
	};
}
