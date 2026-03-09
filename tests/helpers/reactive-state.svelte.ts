import type { Customer } from "../../src/lib/svelte/types.js";
import type { AutumnServerState } from "../../src/lib/sveltekit/client.svelte.js";

export function createReactiveServerState(customer: Customer | null) {
	let currentCustomer = $state(customer);
	let timeFetched = $state(Date.now());

	return {
		getServerState() {
			return {
				customer: currentCustomer,
				_timeFetched: timeFetched,
			} satisfies AutumnServerState;
		},
		setCustomer(nextCustomer: Customer | null) {
			currentCustomer = nextCustomer;
			timeFetched = Date.now();
		},
	};
}
