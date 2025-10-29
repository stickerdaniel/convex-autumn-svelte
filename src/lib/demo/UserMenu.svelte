<script lang="ts">
	import { goto } from '$app/navigation';

	import { Avatar, Popover } from '@skeletonlabs/skeleton-svelte';

	import { useAuth } from '@mmailaender/convex-auth-svelte/sveltekit';
	import { useCustomer } from '$lib/sveltekit';
	import type { Id } from '$lib/convex/_generated/dataModel.js';

	interface Props {
		viewer: {
			_id: Id<'users'>;
			_creationTime: number;
			name?: string;
			email?: string;
			phone?: string;
			image?: string;
			emailVerificationTime?: number;
			phoneVerificationTime?: number;
			isAnonymous?: boolean;
		};
	}

	let { viewer }: Props = $props();

	const { signOut } = useAuth();
	const autumn = useCustomer();

	const isPro = $derived(autumn.customer?.products?.some((p) => p.id === 'pro') ?? false);

	let isUpgrading = $state(false);

	async function handleSignOut() {
		await signOut();
		goto('/');
	}

	async function handleManageBilling() {
		await autumn.openBillingPortal({ returnUrl: `${window.location.origin}/product` });
		openState = false;
	}

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
			console.error('Upgrade failed:', error);
		} finally {
			isUpgrading = false;
		}
	}

	let openState = $state(false);
</script>

<div class="flex items-center gap-2 text-sm font-medium">
	<Popover
		open={openState}
		onOpenChange={(e) => (openState = e.open)}
		positioning={{ placement: 'top' }}
		triggerBase="btn"
		contentBase="card bg-surface-200-800 p-4 space-y-4 max-w-[320px]"
		arrow
		ids={{ trigger: 'user-menu-trigger' }}
	>
		{#snippet trigger()}
			<Avatar src={viewer.image} name={viewer.name ?? 'User'} size="size-10" />
		{/snippet}
		{#snippet content()}
			<div class="px-2 py-1.5 text-sm font-semibold">{viewer.name}</div>

			{#if autumn.customer}
				<div class="rounded bg-surface-300-700 px-2 py-1.5 text-xs">
					<div class="text-surface-600-400 mb-1">Current Plan</div>
					<div class="font-semibold">
						{isPro ? '⭐ Pro' : 'Free'}
					</div>
				</div>
			{/if}

			<hr class="hr border-surface-300-700" />

			{#if !isPro}
				<button
					class="btn preset-filled-primary-500 w-full"
					onclick={handleUpgrade}
					disabled={isUpgrading}
				>
					{isUpgrading ? 'Processing...' : 'Upgrade to Pro'}
				</button>
			{/if}

			<a href="/pricing" class="btn hover:preset-tonal w-full" onclick={() => (openState = false)}>
				View Pricing
			</a>

			<a href="/account" class="btn hover:preset-tonal w-full" onclick={() => (openState = false)}>
				Account Settings
			</a>

			{#if isPro}
				<button class="btn hover:preset-tonal w-full" onclick={handleManageBilling}>
					Manage Billing
				</button>
			{/if}

			<hr class="hr border-surface-300-700" />

			<button class="btn hover:preset-tonal w-full" onclick={handleSignOut}>
				Sign out
			</button>
		{/snippet}
	</Popover>
</div>
