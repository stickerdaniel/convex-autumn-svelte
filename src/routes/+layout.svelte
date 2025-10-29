<script lang="ts">
	import { setupConvex } from 'convex-svelte';
	import { setupConvexAuth } from '@mmailaender/convex-auth-svelte/sveltekit';
	import { setupAutumn } from '$lib/sveltekit';
	import { api } from '$lib/convex/_generated/api';
	import { PUBLIC_CONVEX_URL } from '$env/static/public';
	import '../app.css';

	let { children, data } = $props();

	// Initialize Convex client first to store in context for dependent setups.
	setupConvex(PUBLIC_CONVEX_URL);

	// Initialize auth after Convex client is available in context.
	setupConvexAuth({
		getServerState: () => data.authState,
		options: { verbose: true }
	});

	// Initialize Autumn billing after Convex client is available in context.
	setupAutumn({
		convexApi: api.autumn,
		getServerState: () => data.autumnState
	});
</script>

{@render children()}
