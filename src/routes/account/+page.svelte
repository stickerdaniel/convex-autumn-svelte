<script lang="ts">
	import { useCustomer } from '$lib/sveltekit';
	import type { Product, Entity, QueryResult, CheckResult } from '$lib/svelte/types';
	import { isBrowser } from '$lib/svelte/utils';

	let { data } = $props();

	const autumn = useCustomer();

	let isSettingUpPayment = $state(false);
	let isLoadingProducts = $state(false);
	let isCreatingReferralCode = $state(false);
	let isRedeemingCode = $state(false);
	let isLoadingQuery = $state(false);
	let isLoadingEntity = $state(false);
	let isLoadingUsage = $state(false);

	let products = $state<Product[]>([]);
	let referralCode = $state<string | null>(null);
	let redeemCode = $state('');
	let redeemResult = $state<{ success: boolean; message: string } | null>(null);
	let queryData = $state<QueryResult | null>(null);
	let entityData = $state<Entity | null>(null);
	let entityId = $state('');
	let usageData = $state<CheckResult | null>(null);
	let usageHasBeenChecked = $state(false);

	let setupPaymentError = $state<string | null>(null);
	let productsError = $state<string | null>(null);
	let referralError = $state<string | null>(null);
	let redeemError = $state<string | null>(null);
	let queryError = $state<string | null>(null);
	let entityError = $state<string | null>(null);
	let usageError = $state<string | null>(null);

	const isPro = $derived(autumn.customer?.products?.some((p) => p.id === 'pro') ?? false);

	const messagesFeature = $derived(autumn.customer?.features?.messages);
	const isUnlimited = $derived(messagesFeature?.unlimited ?? false);
	const messagesUsed = $derived(messagesFeature?.usage ?? 0);
	const messagesTotal = $derived(typeof messagesFeature?.included_usage === 'number' ? messagesFeature.included_usage : 0);
	const messagesRemaining = $derived(messagesFeature?.balance ?? 0);

	let setUsageValue = $state('');
	let isSettingUsage = $state(false);
	let setUsageResult = $state<{ success: boolean; message: string } | null>(null);
	let setUsageError = $state<string | null>(null);

	async function handleSetupPayment() {
		if (!isBrowser) return;

		isSettingUpPayment = true;
		setupPaymentError = null;
		try {
			const result = await autumn.setupPayment({
				successUrl: `${window.location.origin}/account?payment_setup=true`
			});
			if (result.url) {
				window.location.href = result.url;
			}
		} catch (error) {
			console.error('Setup payment failed:', error);
			setupPaymentError = error instanceof Error ? error.message : 'Failed to setup payment';
		} finally {
			isSettingUpPayment = false;
		}
	}

	async function handleListProducts() {
		isLoadingProducts = true;
		productsError = null;
		try {
			const result = await autumn.listProducts();
			products = result as Product[];
		} catch (error) {
			console.error('List products failed:', error);
			productsError = error instanceof Error ? error.message : 'Failed to load products';
		} finally {
			isLoadingProducts = false;
		}
	}

	async function handleCreateReferralCode() {
		isCreatingReferralCode = true;
		referralError = null;
		try {
			const result = await autumn.createReferralCode({
				programId: 'default'
			});
			referralCode = result.code;
		} catch (error) {
			console.error('Create referral code failed:', error);
			referralError = error instanceof Error ? error.message : 'Failed to create referral code';
		} finally {
			isCreatingReferralCode = false;
		}
	}

	async function handleRedeemCode() {
		if (!redeemCode.trim()) return;

		isRedeemingCode = true;
		redeemError = null;
		redeemResult = null;
		try {
			const result = await autumn.redeemReferralCode({ code: redeemCode });
			redeemResult = {
				success: result.success,
				message: result.success ? 'Referral code redeemed successfully!' : 'Failed to redeem code'
			};
		} catch (error) {
			console.error('Redeem code failed:', error);
			redeemError = error instanceof Error ? error.message : 'Failed to redeem code';
		} finally {
			isRedeemingCode = false;
		}
	}

	async function handleLoadQuery() {
		isLoadingQuery = true;
		queryError = null;
		try {
			const result = await autumn.query({
				featureId: 'messages',
				range: '30d'
			});
			queryData = result;
		} catch (error) {
			console.error('Query failed:', error);
			queryError = error instanceof Error ? error.message : 'Failed to query data';
		} finally {
			isLoadingQuery = false;
		}
	}

	async function handleCheckUsage() {
		isLoadingUsage = true;
		usageError = null;
		try {
			const result = await autumn.check({
				featureId: 'messages'
			});
			usageData = result;
			usageHasBeenChecked = true;
		} catch (error) {
			console.error('Usage check failed:', error);
			usageError = error instanceof Error ? error.message : 'Failed to check usage';
		} finally {
			isLoadingUsage = false;
		}
	}

	async function handleSetUsage() {
		const value = parseInt(setUsageValue, 10);

		if (isNaN(value) || value < 0) {
			setUsageError = 'Please enter a valid number (0 or greater)';
			return;
		}

		isSettingUsage = true;
		setUsageError = null;
		setUsageResult = null;

		try {
			const result = await autumn.usage({
				featureId: 'messages',
				value: value
			});

			setUsageResult = {
				success: result.success,
				message: result.success
					? `Successfully set usage to ${value}`
					: 'Failed to set usage'
			};

			if (result.success) {
				await autumn.refetch();
			}
		} catch (error) {
			console.error('Set usage failed:', error);
			setUsageError = error instanceof Error ? error.message : 'Failed to set usage';
		} finally {
			isSettingUsage = false;
		}
	}

	async function handleLoadEntity() {
		if (!entityId.trim()) return;

		isLoadingEntity = true;
		entityError = null;
		entityData = null;
		try {
			const result = await autumn.getEntity({ entityId });
			entityData = result;
		} catch (error) {
			console.error('Get entity failed:', error);
			entityError = error instanceof Error ? error.message : 'Failed to load entity';
		} finally {
			isLoadingEntity = false;
		}
	}
</script>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold">Account Settings</h1>
		<p class="text-surface-600-400">Manage your account, billing, and usage</p>
	</div>

	{#if autumn.customer}
		<section class="card mb-6 p-6">
			<h2 class="mb-4 text-xl font-semibold">Account Information</h2>
			<div class="space-y-2 text-sm">
				<div class="flex justify-between">
					<span class="text-surface-600-400">Customer ID:</span>
					<span class="font-mono">{autumn.customer.id}</span>
				</div>
				{#if autumn.customer.email}
					<div class="flex justify-between">
						<span class="text-surface-600-400">Email:</span>
						<span>{autumn.customer.email}</span>
					</div>
				{/if}
				<div class="flex justify-between">
					<span class="text-surface-600-400">Plan:</span>
					<span class="font-semibold">{isPro ? '⭐ Pro' : 'Free'}</span>
				</div>
			</div>
		</section>
	{/if}

	<section class="card mb-6 p-6">
		<h2 class="mb-4 text-xl font-semibold">Payment Methods</h2>
		<p class="text-surface-600-400 mb-4 text-sm">
			Add a payment method to your account without being charged.
		</p>

		{#if setupPaymentError}
			<div class="mb-4 rounded bg-error-500/10 p-3 text-sm text-error-500">
				{setupPaymentError}
			</div>
		{/if}

		<button
			onclick={handleSetupPayment}
			disabled={isSettingUpPayment}
			class="btn preset-filled-primary-500"
		>
			{isSettingUpPayment ? 'Processing...' : 'Setup Payment Method'}
		</button>
	</section>

	<section class="card mb-6 p-6">
		<h2 class="mb-4 text-xl font-semibold">Product Catalog</h2>
		<p class="text-surface-600-400 mb-4 text-sm">View all available products and pricing.</p>

		{#if productsError}
			<div class="mb-4 rounded bg-error-500/10 p-3 text-sm text-error-500">
				{productsError}
			</div>
		{/if}

		<button
			onclick={handleListProducts}
			disabled={isLoadingProducts}
			class="btn preset-filled-surface-500 mb-4"
		>
			{isLoadingProducts ? 'Loading...' : 'Load Products'}
		</button>

		{#if products.length > 0}
			<div class="space-y-3">
				{#each products as product}
					<div class="rounded border border-surface-300-700 p-4">
						<div class="mb-2 flex items-start justify-between">
							<div>
								<h3 class="font-semibold">{product.name}</h3>
								{#if product.description}
									<p class="text-surface-600-400 text-sm">{product.description}</p>
								{/if}
							</div>
						</div>
						{#if product.items && product.items.length > 0}
							<div class="mt-2 space-y-1 text-xs">
								{#each product.items as item}
									<div class="text-surface-600-400">
										{#if item.feature_id}
											• Feature: {item.feature_id}
										{/if}
										{#if item.included_usage}
											- {item.included_usage === 'inf' ? 'Unlimited' : `${item.included_usage} ${item.interval || 'usage'}`}
										{/if}
										{#if item.price !== undefined}
											- ${item.price / 100}
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section class="card mb-6 p-6">
		<h2 class="mb-4 text-xl font-semibold">Referral Program</h2>

		<div class="mb-6">
			<h3 class="mb-2 text-lg font-medium">Your Referral Code</h3>
			<p class="text-surface-600-400 mb-3 text-sm">
				Generate a referral code to share with friends. (create a reward and a campaign with campaign id "default" in autumn dashboard)
			</p>

			{#if referralError}
				<div class="mb-4 rounded bg-error-500/10 p-3 text-sm text-error-500">
					{referralError}
				</div>
			{/if}

			<button
				onclick={handleCreateReferralCode}
				disabled={isCreatingReferralCode}
				class="btn preset-filled-primary-500 mb-3"
			>
				{isCreatingReferralCode ? 'Generating...' : 'Generate Referral Code'}
			</button>

			{#if referralCode}
				<div class="rounded bg-success-500/10 p-4">
					<p class="mb-2 text-sm font-medium text-success-500">Your Referral Code:</p>
					<div class="flex items-center gap-2">
						<code class="rounded bg-surface-300-700 px-3 py-2 font-mono text-lg">
							{referralCode}
						</code>
						<button
							onclick={() => {
								navigator.clipboard.writeText(referralCode ?? '');
							}}
							class="btn preset-tonal btn-sm"
						>
							Copy
						</button>
					</div>
				</div>
			{/if}
		</div>

		<div>
			<h3 class="mb-2 text-lg font-medium">Redeem a Code</h3>
			<p class="text-surface-600-400 mb-3 text-sm">Enter a referral code to claim your reward.</p>

			{#if redeemError}
				<div class="mb-4 rounded bg-error-500/10 p-3 text-sm text-error-500">
					{redeemError}
				</div>
			{/if}

			{#if redeemResult}
				<div
					class={`mb-4 rounded p-3 text-sm ${redeemResult.success ? 'bg-success-500/10 text-success-500' : 'bg-error-500/10 text-error-500'}`}
				>
					{redeemResult.message}
				</div>
			{/if}

			<div class="flex gap-2">
				<input
					type="text"
					bind:value={redeemCode}
					placeholder="Enter referral code"
					class="input flex-1"
				/>
				<button
					onclick={handleRedeemCode}
					disabled={isRedeemingCode || !redeemCode.trim()}
					class="btn preset-filled-primary-500"
				>
					{isRedeemingCode ? 'Redeeming...' : 'Redeem'}
				</button>
			</div>
		</div>
	</section>

	<section class="card mb-6 p-6">
		<h2 class="mb-4 text-xl font-semibold">Usage Analytics</h2>

		<h3 class="mb-2 text-lg font-medium">Usage History (30 Days)</h3>
		<p class="text-surface-600-400 mb-3 text-sm">Query your usage history and trends.</p>

		{#if queryError}
			<div class="mb-4 rounded bg-error-500/10 p-3 text-sm text-error-500">
				{queryError}
			</div>
		{/if}

		<button
			onclick={handleLoadQuery}
			disabled={isLoadingQuery}
			class="btn preset-filled-surface-500 mb-3"
		>
			{isLoadingQuery ? 'Loading...' : 'Query Usage History'}
		</button>

		{#if queryData}
			<div class="rounded border border-surface-300-700 p-4">
				<pre class="text-xs"><code>{JSON.stringify(queryData, null, 2)}</code></pre>
			</div>
		{/if}
	</section>

	<section class="card mb-6 p-6">
		<h2 class="mb-4 text-xl font-semibold">Current Usage Status</h2>
		<p class="text-surface-600-400 mb-4 text-sm">
			View your current usage amount and limit for the messages feature.
		</p>

		{#if usageError}
			<div class="mb-4 rounded bg-error-500/10 p-3 text-sm text-error-500">
				{usageError}
			</div>
		{/if}

		<button
			onclick={handleCheckUsage}
			disabled={isLoadingUsage}
			class="btn preset-filled-surface-500 mb-4"
		>
			{isLoadingUsage ? 'Checking...' : 'Check Current Usage'}
		</button>

		{#if usageHasBeenChecked && autumn.customer && messagesFeature}
			<div class="rounded border border-surface-300-700 p-4">
				<h3 class="mb-3 font-semibold">Usage Details</h3>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-surface-600-400">Current Usage:</span>
						<span class="font-mono">{messagesUsed}</span>
					</div>
					{#if !isUnlimited}
						<div class="flex justify-between">
							<span class="text-surface-600-400">Limit:</span>
							<span class="font-mono">{messagesTotal}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-surface-600-400">Remaining:</span>
							<span class="font-mono font-semibold">{messagesRemaining}</span>
						</div>
					{/if}
					<div class="flex justify-between">
						<span class="text-surface-600-400">Access Allowed:</span>
						<span class="font-mono">{usageData?.allowed ? '✓ Yes' : '✗ No'}</span>
					</div>
				</div>
			</div>
		{/if}
	</section>

	<section class="card mb-6 p-6">
		<h2 class="mb-4 text-xl font-semibold">Set Usage (Testing)</h2>
		<p class="text-surface-600-400 mb-4 text-sm">
			Test the <code class="text-xs">autumn.usage()</code> method by setting the usage value to an absolute number.
			Unlike <code class="text-xs">track()</code> which increments usage, this sets it to exactly the value you specify.
		</p>

		<div class="mb-4 rounded border border-warning-500/30 bg-warning-500/10 p-4">
			<div class="mb-2 flex items-start gap-2">
				<span class="text-lg">⚠️</span>
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-warning-600-400">Admin/Testing Use Only</p>
					<p class="text-xs text-warning-600-400">
						This method allows setting usage to any value (including 0). In production applications,
						this should only be accessible to admins or used in internal backend operations. Regular users
						should use <code>track()</code> to increment usage instead.
					</p>
				</div>
			</div>
		</div>

		{#if setUsageError}
			<div class="mb-4 rounded bg-error-500/10 p-3 text-sm text-error-500">
				{setUsageError}
			</div>
		{/if}

		{#if setUsageResult}
			<div
				class={`mb-4 rounded p-3 text-sm ${setUsageResult.success ? 'bg-success-500/10 text-success-500' : 'bg-error-500/10 text-error-500'}`}
			>
				{setUsageResult.message}
			</div>
		{/if}

		<div class="space-y-3">
			<div>
				<label for="setUsageValue" class="mb-1 block text-sm font-medium">
					Set Messages Usage To:
				</label>
				<div class="flex gap-2">
					<input
						id="setUsageValue"
						type="number"
						min="0"
						step="1"
						bind:value={setUsageValue}
						placeholder="Enter value (e.g., 0, 5, 100)"
						class="input flex-1"
						disabled={isSettingUsage}
					/>
					<button
						onclick={handleSetUsage}
						disabled={isSettingUsage || !setUsageValue.trim()}
						class="btn preset-filled-primary-500"
					>
						{isSettingUsage ? 'Setting...' : 'Set Usage'}
					</button>
				</div>
				<p class="text-surface-600-400 mt-1 text-xs">
					Current usage will be set to exactly this value. The "Current Usage Status" section above will update automatically.
				</p>
			</div>

			<div class="rounded bg-surface-200-800 p-3">
				<p class="mb-2 text-xs font-medium text-surface-600-400">Quick Actions:</p>
				<div class="flex flex-wrap gap-2">
					<button
						onclick={() => {
							setUsageValue = '0';
							handleSetUsage();
						}}
						disabled={isSettingUsage}
						class="btn btn-sm preset-tonal-surface-500"
					>
						Reset to 0
					</button>
					<button
						onclick={() => {
							setUsageValue = String(messagesTotal);
							handleSetUsage();
						}}
						disabled={isSettingUsage || messagesTotal === 0}
						class="btn btn-sm preset-tonal-surface-500"
					>
						Set to Limit ({messagesTotal})
					</button>
					<button
						onclick={() => {
							setUsageValue = String(Math.floor(messagesTotal / 2));
							handleSetUsage();
						}}
						disabled={isSettingUsage || messagesTotal === 0}
						class="btn btn-sm preset-tonal-surface-500"
					>
						Set to Half ({Math.floor(messagesTotal / 2)})
					</button>
				</div>
			</div>

			<details class="mt-4">
				<summary class="cursor-pointer text-xs text-surface-600-400">
					📖 How This Works
				</summary>
				<div class="text-surface-600-400 mt-2 space-y-2 text-xs">
					<p>
						<strong>What happens when you click "Set Usage":</strong>
					</p>
					<ol class="ml-4 list-decimal space-y-1">
						<li>Calls <code>autumn.usage({'{ featureId: \'messages\', value: X }'})</code></li>
						<li>Backend sends request to Autumn API with your secret key</li>
						<li>Autumn sets your usage to exactly the value specified</li>
						<li>Returns <code>{'{ success: true }'}</code></li>
						<li>We call <code>autumn.refetch()</code> to update the customer data</li>
						<li>The "Current Usage Status" section above updates automatically (reactive)</li>
					</ol>
					<p class="mt-2">
						<strong>Difference from track():</strong> The <code>track()</code> method <em>increments</em> usage
						by a value (e.g., +1, +5), while <code>usage()</code> <em>sets</em> usage to an absolute value.
					</p>
				</div>
			</details>
		</div>
	</section>

	<section class="card mb-6 p-6">
		<h2 class="mb-4 text-xl font-semibold">Entity Management</h2>
		<p class="text-surface-600-400 mb-4 text-sm">
			View details for entities (e.g., teams, projects, or workspaces).
		</p>

		{#if entityError}
			<div class="mb-4 rounded bg-error-500/10 p-3 text-sm text-error-500">
				{entityError}
			</div>
		{/if}

		<div class="flex gap-2">
			<input
				type="text"
				bind:value={entityId}
				placeholder="Enter entity ID"
				class="input flex-1"
			/>
			<button
				onclick={handleLoadEntity}
				disabled={isLoadingEntity || !entityId.trim()}
				class="btn preset-filled-surface-500"
			>
				{isLoadingEntity ? 'Loading...' : 'Load Entity'}
			</button>
		</div>

		{#if entityData}
			<div class="mt-4 rounded border border-surface-300-700 p-4">
				<h3 class="mb-2 font-semibold">Entity Details</h3>
				<pre class="text-xs"><code>{JSON.stringify(entityData, null, 2)}</code></pre>
			</div>
		{/if}
	</section>

	<div class="text-center">
		<a href="/product" class="anchor">← Back to Product</a>
	</div>
</div>
