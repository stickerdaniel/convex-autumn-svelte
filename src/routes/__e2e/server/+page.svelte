<script lang="ts">
	import { normalizeCustomer } from "$lib/e2e/normalize";

	let { data } = $props();

	function serialize(value: unknown) {
		return JSON.stringify(value ?? null, null, 2);
	}
</script>

<div class="container mx-auto max-w-5xl space-y-6 px-4 py-8">
	<header class="space-y-2">
		<h1 class="text-3xl font-bold">Autumn Server Helper Harness</h1>
		<p class="text-sm text-surface-600-400">
			Server-side contract harness for <code>createAutumnHandlers()</code>.
		</p>
	</header>

	<section class="grid gap-4 md:grid-cols-3">
		<div class="card p-4">
			<h2 class="mb-2 text-lg font-semibold">Customer</h2>
			<pre data-testid="server-customer" class="overflow-auto text-xs">
{serialize(normalizeCustomer(data.customer))}</pre
			>
		</div>
		<div class="card p-4">
			<h2 class="mb-2 text-lg font-semibold">Entity</h2>
			<pre data-testid="server-entity" class="overflow-auto text-xs">{serialize(data.entity)}</pre>
		</div>
		<div class="card p-4">
			<h2 class="mb-2 text-lg font-semibold">Viewer</h2>
			<pre data-testid="server-viewer" class="overflow-auto text-xs">{serialize(data.viewer)}</pre>
		</div>
	</section>
</div>
