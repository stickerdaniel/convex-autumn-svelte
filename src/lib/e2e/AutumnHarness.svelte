<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { tick } from "svelte";
	import { useConvexClient } from "convex-svelte";

	import { api } from "$lib/convex/_generated/api";
	import { normalizeCustomer } from "./normalize";

	interface AutumnLike {
		customer: unknown;
		allowed(params: { featureId: string; requiredBalance?: number }): unknown;
		check(params: { featureId: string }, options?: { refetch?: boolean }): Promise<unknown>;
		checkout(
			params: { productId: string; dialog?: (url: string) => void; successUrl?: string },
			options?: { refetch?: boolean },
		): Promise<unknown>;
		track(
			params: { featureId: string; value: number },
			options?: { refetch?: boolean },
		): Promise<unknown>;
		attach(
			params: { productId: string },
			options?: { refetch?: boolean },
		): Promise<unknown>;
		cancel(
			params: { productId: string; cancelImmediately?: boolean },
			options?: { refetch?: boolean },
		): Promise<unknown>;
		openBillingPortal(params?: { returnUrl?: string }): Promise<unknown>;
		createEntity(
			params: { id: string; name?: string; featureId: string },
			options?: { refetch?: boolean },
		): Promise<unknown>;
		getEntity(params: { entityId: string }): Promise<unknown>;
		setupPayment(
			params?: { successUrl?: string },
			options?: { refetch?: boolean },
		): Promise<unknown>;
		createReferralCode(
			params: { programId: string },
			options?: { refetch?: boolean },
		): Promise<unknown>;
		redeemReferralCode(
			params: { code: string },
			options?: { refetch?: boolean },
		): Promise<unknown>;
		listProducts(): Promise<unknown>;
		usage(params: { featureId: string; value: number }): Promise<unknown>;
		query(params: {
			featureId: string;
			range?: "24h" | "7d" | "30d" | "90d" | "last_cycle";
		}): Promise<unknown>;
		listEvents(params: {
			featureId: string | string[];
			limit?: number;
			offset?: number;
		}): Promise<unknown>;
		aggregateEvents(params: {
			featureId: string | string[];
			range?: "24h" | "7d" | "30d" | "90d" | "last_cycle" | "1bc" | "3bc";
			groupBy?: string;
			binSize?: "day" | "hour";
		}): Promise<unknown>;
		refetch(): Promise<void>;
	}

	interface Props {
		autumn: AutumnLike;
		mode: "svelte" | "sveltekit";
		referralProgramId: string;
		fetchCount?: number;
		invalidateCount?: number;
		captureRedirects?: boolean;
	}

	let {
		autumn,
		mode,
		referralProgramId,
		fetchCount = undefined,
		invalidateCount = undefined,
		captureRedirects = true,
	}: Props = $props();

	const client = useConvexClient();

	let entityIdInput = $state("");
	let redeemCodeInput = $state("");
	let createdEntityId = $state<string | null>(null);
	let createdReferralCode = $state<string | null>(null);
	let capturedBillingPortalUrl = $state<string | null>(null);
	let capturedCheckoutUrl = $state<string | null>(null);
	let operationResults = $state<Record<string, unknown>>({});
	let operationErrors = $state<Record<string, string | null>>({});
	let beforeSnapshots = $state<Record<string, unknown>>({});
	let afterSnapshots = $state<Record<string, unknown>>({});

	function serialize(value: unknown) {
		return JSON.stringify(value ?? null, null, 2);
	}

	function snapshot() {
		return normalizeCustomer(autumn.customer as never);
	}

	async function settle() {
		await tick();
		await Promise.resolve();
		await Promise.resolve();
	}

	async function runOperation(name: string, execute: () => Promise<unknown>) {
		beforeSnapshots[name] = snapshot();
		operationErrors[name] = null;

		try {
			operationResults[name] = await execute();
		} catch (error) {
			operationErrors[name] =
				error instanceof Error ? error.message : String(error);
			operationResults[name] = null;
		} finally {
			await settle();
			afterSnapshots[name] = snapshot();
		}
	}

	async function handleReset() {
		await runOperation("reset", async () => {
			const result = await client.action(api.e2e.resetCurrentUser, {});
			await autumn.refetch();
			return result;
		});
	}

	async function handleCheck() {
		await runOperation("check", async () =>
			await autumn.check({ featureId: "messages" }),
		);
	}

	async function handleTrack() {
		await runOperation("track", async () =>
			await autumn.track({ featureId: "messages", value: 1 }),
		);
	}

	async function handleUsage() {
		await runOperation("usage", async () =>
			await autumn.usage({ featureId: "messages", value: 0 }),
		);
	}

	async function handleListProducts() {
		await runOperation("listProducts", async () => await autumn.listProducts());
	}

	async function handleQuery() {
		await runOperation("query", async () =>
			await autumn.query({ featureId: "messages", range: "30d" }),
		);
	}

	async function handleListEvents() {
		await runOperation("listEvents", async () =>
			await autumn.listEvents({ featureId: "messages", limit: 10, offset: 0 }),
		);
	}

	async function handleAggregateEvents() {
		await runOperation("aggregateEvents", async () =>
			await autumn.aggregateEvents({ featureId: "messages", range: "30d" }),
		);
	}

	async function handleAttach() {
		await runOperation("attach", async () =>
			await autumn.attach({ productId: "pro" }),
		);
	}

	async function handleCancel() {
		await runOperation("cancel", async () =>
			await autumn.cancel({ productId: "pro", cancelImmediately: true }),
		);
	}

	async function handleCreateEntity() {
		const nextEntityId = `e2e-${mode}-${Date.now()}`;
		createdEntityId = nextEntityId;
		entityIdInput = nextEntityId;

		await runOperation("createEntity", async () =>
			await autumn.createEntity({
				id: nextEntityId,
				name: `E2E ${mode} entity`,
				featureId: "messages",
			}),
		);
	}

	async function handleGetEntity() {
		const entityId = entityIdInput.trim() || createdEntityId;
		if (!entityId) {
			operationErrors.getEntity = "No entity id available";
			return;
		}

		await runOperation("getEntity", async () =>
			await autumn.getEntity({ entityId }),
		);
	}

	async function handleCreateReferralCode() {
		await runOperation("createReferralCode", async () => {
			const result = (await autumn.createReferralCode({
				programId: referralProgramId,
			})) as { code?: string };
			if (result.code) {
				createdReferralCode = result.code;
				redeemCodeInput = result.code;
			}
			return result;
		});
	}

	async function handleRedeemReferralCode() {
		const code = redeemCodeInput.trim() || createdReferralCode;
		if (!code) {
			operationErrors.redeemReferralCode = "No referral code available";
			return;
		}

		await runOperation("redeemReferralCode", async () =>
			await autumn.redeemReferralCode({ code }),
		);
	}

	async function handleCheckout() {
		capturedCheckoutUrl = null;
		await runOperation("checkout", async () =>
			await autumn.checkout({
				productId: "pro",
				successUrl: `${window.location.origin}/__e2e/${mode}`,
				dialog: captureRedirects
					? (url: string) => {
							capturedCheckoutUrl = url;
						}
					: undefined,
			}),
		);
	}

	async function handleSetupPayment() {
		await runOperation("setupPayment", async () =>
			await autumn.setupPayment({
				successUrl: `${window.location.origin}/__e2e/${mode}`,
			}),
		);
	}

	async function handleBillingPortal() {
		capturedBillingPortalUrl = null;
		await runOperation("billingPortal", async () =>
			await autumn.openBillingPortal({
				returnUrl: `${window.location.origin}/__e2e/${mode}`,
			}),
		);
	}

	let restoreWindowOpen: (() => void) | null = null;

	onMount(() => {
		if (!captureRedirects) {
			return;
		}

		const originalOpen = window.open.bind(window);
		window.open = ((url: string | URL | undefined) => {
			capturedBillingPortalUrl = url ? String(url) : null;
			return null;
		}) as typeof window.open;

		restoreWindowOpen = () => {
			window.open = originalOpen;
		};
	});

	onDestroy(() => {
		restoreWindowOpen?.();
	});

	const currentAllowed = $derived(
		autumn.allowed({ featureId: "messages" }) as { allowed: boolean; reason?: string },
	);
</script>

<div class="container mx-auto max-w-7xl space-y-6 px-4 py-8">
	<header class="space-y-2">
		<h1 class="text-3xl font-bold">Autumn {mode} E2E Harness</h1>
		<p class="text-sm text-surface-600-400">
			Stable regression harness for wrapper-level Playwright coverage.
		</p>
	</header>

	<section class="grid gap-4 md:grid-cols-4">
		<div class="card p-4">
			<div class="text-sm text-surface-600-400">Mode</div>
			<div data-testid="mode" class="font-mono">{mode}</div>
		</div>
		<div class="card p-4">
			<div class="text-sm text-surface-600-400">Fetch Count</div>
			<div data-testid="fetch-count" class="font-mono">{fetchCount ?? 0}</div>
		</div>
		<div class="card p-4">
			<div class="text-sm text-surface-600-400">Invalidate Count</div>
			<div data-testid="invalidate-count" class="font-mono">{invalidateCount ?? 0}</div>
		</div>
		<div class="card p-4">
			<div class="text-sm text-surface-600-400">Local Allowed</div>
			<pre data-testid="allowed-current" class="font-mono text-xs">{serialize(currentAllowed)}</pre>
		</div>
	</section>

	<section class="card space-y-3 p-4">
		<div class="flex flex-wrap gap-3">
			<button data-testid="run-reset" class="btn preset-filled-primary-500" onclick={handleReset}>
				Reset Current User
			</button>
			<button data-testid="run-check" class="btn preset-filled-surface-500" onclick={handleCheck}>
				Check
			</button>
			<button data-testid="run-track" class="btn preset-filled-surface-500" onclick={handleTrack}>
				Track
			</button>
			<button data-testid="run-usage" class="btn preset-filled-surface-500" onclick={handleUsage}>
				Usage
			</button>
			<button
				data-testid="run-listProducts"
				class="btn preset-filled-surface-500"
				onclick={handleListProducts}
			>
				List Products
			</button>
			<button data-testid="run-query" class="btn preset-filled-surface-500" onclick={handleQuery}>
				Query
			</button>
			<button
				data-testid="run-listEvents"
				class="btn preset-filled-surface-500"
				onclick={handleListEvents}
			>
				List Events
			</button>
			<button
				data-testid="run-aggregateEvents"
				class="btn preset-filled-surface-500"
				onclick={handleAggregateEvents}
			>
				Aggregate Events
			</button>
			<button data-testid="run-attach" class="btn preset-filled-surface-500" onclick={handleAttach}>
				Attach Pro
			</button>
			<button data-testid="run-cancel" class="btn preset-filled-surface-500" onclick={handleCancel}>
				Cancel Pro
			</button>
			<button
				data-testid="run-createEntity"
				class="btn preset-filled-surface-500"
				onclick={handleCreateEntity}
			>
				Create Entity
			</button>
			<button
				data-testid="run-getEntity"
				class="btn preset-filled-surface-500"
				onclick={handleGetEntity}
			>
				Get Entity
			</button>
			<button
				data-testid="run-createReferralCode"
				class="btn preset-filled-surface-500"
				onclick={handleCreateReferralCode}
			>
				Create Referral Code
			</button>
			<button
				data-testid="run-redeemReferralCode"
				class="btn preset-filled-surface-500"
				onclick={handleRedeemReferralCode}
			>
				Redeem Referral Code
			</button>
			<button data-testid="run-checkout" class="btn preset-filled-surface-500" onclick={handleCheckout}>
				Checkout
			</button>
			<button
				data-testid="run-setupPayment"
				class="btn preset-filled-surface-500"
				onclick={handleSetupPayment}
			>
				Setup Payment
			</button>
			<button
				data-testid="run-billingPortal"
				class="btn preset-filled-surface-500"
				onclick={handleBillingPortal}
			>
				Billing Portal
			</button>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<label class="flex flex-col gap-2 text-sm">
				Entity ID
				<input
					data-testid="entity-id-input"
					class="input"
					bind:value={entityIdInput}
					placeholder="e2e-entity-id"
				/>
			</label>
			<label class="flex flex-col gap-2 text-sm">
				Referral Code
				<input
					data-testid="redeem-code-input"
					class="input"
					bind:value={redeemCodeInput}
					placeholder="Referral code"
				/>
			</label>
		</div>
	</section>

	<section class="grid gap-4 lg:grid-cols-2">
		<div class="card p-4">
			<h2 class="mb-2 text-lg font-semibold">Current Customer</h2>
			<pre data-testid="customer-current" class="overflow-auto text-xs">{serialize(snapshot())}</pre>
		</div>
		<div class="card p-4">
			<h2 class="mb-2 text-lg font-semibold">Captured Redirects</h2>
			<pre data-testid="captured-checkout-url" class="overflow-auto text-xs">{serialize(capturedCheckoutUrl)}</pre>
			<pre data-testid="captured-billing-portal-url" class="overflow-auto text-xs">{serialize(capturedBillingPortalUrl)}</pre>
			<pre data-testid="created-entity-id" class="overflow-auto text-xs">{serialize(createdEntityId)}</pre>
			<pre data-testid="created-referral-code" class="overflow-auto text-xs">{serialize(createdReferralCode)}</pre>
		</div>
	</section>

	<section class="grid gap-4 lg:grid-cols-3">
		{#each [
			"reset",
			"check",
			"track",
			"usage",
			"listProducts",
			"query",
			"listEvents",
			"aggregateEvents",
			"attach",
			"cancel",
			"createEntity",
			"getEntity",
			"createReferralCode",
			"redeemReferralCode",
			"checkout",
			"setupPayment",
			"billingPortal",
		] as operation}
			<div class="card space-y-2 p-4">
				<h3 class="font-semibold">{operation}</h3>
				<pre data-testid={`before-${operation}`} class="overflow-auto text-xs">
{serialize(beforeSnapshots[operation])}</pre
				>
				<pre data-testid={`result-${operation}`} class="overflow-auto text-xs">
{serialize(operationResults[operation])}</pre
				>
				<pre data-testid={`error-${operation}`} class="overflow-auto text-xs">
{serialize(operationErrors[operation])}</pre
				>
				<pre data-testid={`after-${operation}`} class="overflow-auto text-xs">
{serialize(afterSnapshots[operation])}</pre
				>
			</div>
		{/each}
	</section>
</div>
