<script lang="ts">
	import { api } from '$lib/convex/_generated/api';
	import Chat from '$lib/demo/Chat/Chat.svelte';
	import ChatIntro from '$lib/demo/Chat/ChatIntro.svelte';
	import UserMenu from '$lib/demo/UserMenu.svelte';
	import { useQuery } from 'convex-svelte';
	import { useCustomer } from '$lib/sveltekit';

	let { data } = $props();

	const viewer = useQuery(api.users.viewer, {}, () => ({ initialData: data.viewer }));
	// Access through the object to preserve getter reactivity.
	const autumn = useCustomer();

	// Track upgrade operation state to prevent double-submissions.
	let isUpgrading = $state(false);

	const messagesFeature = $derived(autumn.customer?.features?.messages);
	const isPro = $derived(autumn.customer?.products?.some((p) => p.id === 'pro') ?? false);
	const isUnlimited = $derived(messagesFeature?.unlimited ?? false);
	const messagesUsed = $derived(messagesFeature?.usage ?? 0);
	const messagesTotal = $derived(typeof messagesFeature?.included_usage === 'number' ? messagesFeature.included_usage : 0);
	const messagesRemaining = $derived(messagesFeature?.balance ?? 0);

	const isNearingLimit = $derived(
		!isUnlimited && messagesRemaining <= 3 && messagesRemaining > 0
	);
	const hasReachedLimit = $derived(!isUnlimited && messagesRemaining <= 0);

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
</script>

{#if viewer.data}
	<main class="flex max-h-screen grow flex-col overflow-hidden">
		<div class="flex items-start justify-between border-b border-surface-200-800 p-4">
			<div class="flex flex-col gap-2">
				<ChatIntro />

				{#if autumn.customer}
					<div class="flex items-center gap-2 text-sm">
						{#if isPro}
							<span class="rounded bg-primary-500 px-2 py-1 font-bold text-white"
								>PRO</span
							>
						{/if}
						{#if isUnlimited}
							<span class="text-surface-600-400">Unlimited messages</span>
						{:else}
							<span class="text-surface-600-400">
								{messagesUsed} of {messagesTotal} messages used
								{#if messagesRemaining > 0}
									({messagesRemaining} remaining)
								{/if}
							</span>
						{/if}
					</div>

					{#if isNearingLimit}
						<div class="rounded bg-warning-500/10 p-3 text-sm">
							<p class="mb-1 font-medium text-warning-500">
								Running low on messages!
							</p>
							<p class="mb-2 text-warning-600-400">
								You have {messagesRemaining} message{messagesRemaining === 1
									? ''
									: 's'} left.
							</p>
							<button
								onclick={handleUpgrade}
								disabled={isUpgrading}
								class="btn preset-filled-warning-500 btn-sm"
							>
								{isUpgrading ? 'Processing...' : 'Upgrade to Pro'}
							</button>
						</div>
					{:else if hasReachedLimit}
						<div class="rounded bg-error-500/10 p-3 text-sm">
							<p class="mb-1 font-medium text-error-500">Message limit reached</p>
							<p class="mb-2 text-error-600-400">
								Upgrade to Pro for unlimited messages.
							</p>
							<button
								onclick={handleUpgrade}
								disabled={isUpgrading}
								class="btn preset-filled-error-500 btn-sm"
							>
								{isUpgrading ? 'Processing...' : 'Upgrade Now'}
							</button>
						</div>
					{/if}
				{/if}
			</div>

			<UserMenu viewer={viewer.data} />
		</div>
		<Chat viewerId={viewer.data._id} initialMessages={data.messages} />
	</main>
{/if}
