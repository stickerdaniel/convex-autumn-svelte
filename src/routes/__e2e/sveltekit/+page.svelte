<script lang="ts">
	import { invalidate } from "$app/navigation";
	import { page } from "$app/state";

	import AutumnHarness from "$lib/e2e/AutumnHarness.svelte";
	import { api } from "$lib/convex/_generated/api";
	import { setupAutumn } from "$lib/sveltekit";

	let { data } = $props();

	let invalidateCount = $state(0);

	async function countedInvalidate(resource: string | URL) {
		invalidateCount += 1;
		await invalidate(resource);
	}

	const autumn = setupAutumn({
		convexApi: api.autumn,
		getServerState: () => data.autumnState,
		invalidate: countedInvalidate,
	});
	const captureRedirects = $derived(page.url.searchParams.get("redirects") !== "1");
</script>

<AutumnHarness
	{autumn}
	mode="sveltekit"
	{captureRedirects}
	referralProgramId={data.referralProgramId}
	{invalidateCount}
/>
