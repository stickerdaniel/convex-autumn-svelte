<script lang="ts">
	import { useAuth } from '@mmailaender/convex-auth-svelte/sveltekit';
	import { useCustomer } from '$lib/sveltekit';

	const { isAuthenticated } = useAuth();
	const autumn = useCustomer();

	const isPro = $derived(
		autumn.customer?.products?.some((p) => p.id === 'pro') ?? false
	);

	// Per-operation loading state.
	let isUpgrading = $state(false);

	async function handleUpgrade() {
		isUpgrading = true;
		try {
			const result = await autumn.checkout({
				productId: 'pro',
				successUrl: `${window.location.origin}/product?upgraded=true`
			});

			if (result.url) {
				window.location.href = result.url;
			}
		} catch (error) {
			console.error('Checkout error:', error);
			alert('Failed to start checkout. Please try again.');
		} finally {
			isUpgrading = false;
		}
	}
</script>

<div class="container mx-auto px-4 py-12">
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-4xl font-bold">Simple, Transparent Pricing</h1>
		<p class="text-surface-600-400 text-lg">
			Choose the plan that fits your needs
		</p>
	</div>

	<div class="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
		<!-- Free Plan -->
		<div class="card p-8">
			<div class="mb-6">
				<h2 class="mb-2 text-2xl font-bold">Free</h2>
				<div class="mb-4">
					<span class="text-4xl font-bold">$0</span>
					<span class="text-surface-600-400">/month</span>
				</div>
				<p class="text-surface-600-400">Perfect for trying out the platform</p>
			</div>

			<ul class="mb-8 space-y-3">
				<li class="flex items-center gap-2">
					<span class="text-success-500">✓</span>
					<span>10 messages included</span>
				</li>
				<li class="flex items-center gap-2">
					<span class="text-success-500">✓</span>
					<span>Basic features</span>
				</li>
				<li class="flex items-center gap-2">
					<span class="text-success-500">✓</span>
					<span>Community support</span>
				</li>
			</ul>

			{#if isAuthenticated && !isPro}
				<div class="rounded-lg bg-success-500/10 p-4 text-center">
					<p class="font-medium text-success-500">Current Plan</p>
				</div>
			{:else if !isAuthenticated}
				<a href="/signin" class="btn preset-filled-surface-500 w-full">
					Get Started
				</a>
			{/if}
		</div>

		<!-- Pro Plan -->
		<div class="card border-primary-500 relative overflow-hidden border-2 p-8">
			<div class="bg-primary-500 absolute right-0 top-0 px-4 py-1 text-sm font-bold text-white">
				POPULAR
			</div>

			<div class="mb-6">
				<h2 class="mb-2 text-2xl font-bold">Pro</h2>
				<div class="mb-4">
					<span class="text-4xl font-bold">$10</span>
					<span class="text-surface-600-400">/month</span>
				</div>
				<p class="text-surface-600-400">For power users who need unlimited access</p>
			</div>

			<ul class="mb-8 space-y-3">
				<li class="flex items-center gap-2">
					<span class="text-success-500">✓</span>
					<span class="font-medium">Unlimited messages</span>
				</li>
				<li class="flex items-center gap-2">
					<span class="text-success-500">✓</span>
					<span>All features</span>
				</li>
				<li class="flex items-center gap-2">
					<span class="text-success-500">✓</span>
					<span>Priority support</span>
				</li>
				<li class="flex items-center gap-2">
					<span class="text-success-500">✓</span>
					<span>Early access to new features</span>
				</li>
			</ul>

			{#if !isAuthenticated}
				<a href="/signin" class="btn preset-filled-primary-500 w-full">
					Sign Up for Pro
				</a>
			{:else if isPro}
				<div class="rounded-lg bg-success-500/10 p-4 text-center">
					<p class="font-medium text-success-500">Current Plan</p>
				</div>
			{:else}
				<button
					onclick={handleUpgrade}
					disabled={isUpgrading}
					class="btn preset-filled-primary-500 w-full"
				>
					{isUpgrading ? 'Processing...' : 'Upgrade to Pro'}
				</button>
			{/if}
		</div>
	</div>

	<div class="mt-12 text-center">
		<p class="text-surface-600-400 text-sm">
			All plans include secure authentication and data protection. Cancel anytime.
		</p>
	</div>
</div>
