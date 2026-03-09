<script lang="ts">
	import { onDestroy } from "svelte";
	import { page } from "$app/state";
	import { useConvexClient } from "convex-svelte";

	import AutumnHarness from "$lib/e2e/AutumnHarness.svelte";
	import { api } from "$lib/convex/_generated/api";
	import { setupAutumn } from "$lib/svelte/index.svelte.js";

	let { data } = $props();

	const convexClient = useConvexClient();

	let fetchCount = $state(0);

	const originalAction = convexClient.action.bind(convexClient);
	convexClient.action = (async (reference: unknown, args: unknown) => {
		if (reference === api.autumn.createCustomer) {
			fetchCount += 1;
		}

		return await originalAction(reference as never, args as never);
	}) as typeof convexClient.action;

	onDestroy(() => {
		convexClient.action = originalAction;
	});

	const autumn = setupAutumn({ convexApi: api.autumn });
	const captureRedirects = $derived(page.url.searchParams.get("redirects") !== "1");
</script>

<AutumnHarness
	{autumn}
	mode="svelte"
	referralProgramId={data.referralProgramId}
	{captureRedirects}
	{fetchCount}
/>
