# Autumn Svelte

Reactive Svelte 5 bindings for [Autumn](https://useautumn.com) billing with [Convex](https://convex.dev).

## Features

- **Customer Data Management** - Manual state management with automatic refetch after mutations
- **TypeScript Support** - Full type safety with generated Convex types
- **Billing Operations** - Check access, initiate checkout, track usage
- **Feature Access Control** - Local and server-side access checks
- **Entity Billing** - Support for entity-based billing

> **Note:** This vanilla Svelte client uses manual state management (not reactive queries) because Autumn operations are Actions (not Queries). Customer data is fetched once on initialization and automatically refetched after mutations. For full SSR support with automatic invalidation, use the [SvelteKit version](../sveltekit/README.md).

## Installation

```bash
bun add @stickerdaniel/convex-autumn-svelte convex convex-svelte
```

## Setup

### 1. Configure Autumn in your Convex backend

First, set up Autumn in your Convex project following the [Autumn Convex documentation](https://docs.useautumn.com/convex).

```typescript
// convex/autumn.ts
import { Autumn } from "@useautumn/convex";
import { components } from "./_generated/api";

export const autumn = new Autumn(components.autumn, {
  secretKey: process.env.AUTUMN_SECRET_KEY ?? "",
  identify: async (ctx) => {
    // Your authentication logic
    const user = await ctx.auth.getUserIdentity();
    if (!user) return null;

    return {
      customerId: user.subject,
      customerData: {
        name: user.name,
        email: user.email,
      },
    };
  },
});

export const {
  query,
  check,
  checkout,
  track,
  attach,
  cancel,
  billingPortal,
  createEntity,
  getEntity,
} = autumn.api();
```

### 2. Initialize in your root component

```svelte
<!-- App.svelte or +layout.svelte -->
<script lang="ts">
  import { setupConvex } from 'convex-svelte';
  import { setupAutumn } from '@stickerdaniel/convex-autumn-svelte/svelte';
  import { api } from './convex/_generated/api';
  import { PUBLIC_CONVEX_URL } from '$env/static/public';

  // Setup Convex client
  setupConvex(PUBLIC_CONVEX_URL);

  // Setup Autumn
  setupAutumn({ convexApi: api.autumn });
</script>

<slot />
```

## Usage

### Access Customer Data

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';

  // Don't destructure - use the object directly to preserve reactivity
  const autumn = useCustomer();
</script>

{#if autumn.isLoading}
  <p>Loading...</p>
{:else if autumn.error}
  <p>Error: {autumn.error.message}</p>
{:else if autumn.customer}
  <div>
    <h1>Welcome {autumn.customer.name}!</h1>
    <p>Email: {autumn.customer.email}</p>

    {#if autumn.customer.features}
      <ul>
        {#each Object.values(autumn.customer.features) as feature}
          <li>{feature.name}: {feature.balance} remaining</li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}
```

### Check Feature Access (Local)

Use the `allowed()` helper for client-side checks that don't consume usage:

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';

  const autumn = useCustomer();

  const canSendMessage = $derived(
    autumn.allowed({ featureId: 'messages', requiredBalance: 1 }).allowed
  );
</script>

<button disabled={!canSendMessage} onclick={() => sendMessage()}>
  Send Message
</button>

{#if !canSendMessage}
  <p>You've reached your message limit. Please upgrade!</p>
{/if}
```

### Check Feature Access (Server-side)

For checks that consume usage or need server-side validation:

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';

  const autumn = useCustomer();

  async function sendMessage() {
    const result = await autumn.check({ featureId: 'messages' });

    if (result.allowed) {
      // Proceed with sending the message
      // The usage has been tracked on the server
    } else {
      alert('You do not have access to this feature');
    }
  }
</script>
```

### Initiate Checkout

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';

  const autumn = useCustomer();

  async function upgradeToPro() {
    const result = await autumn.checkout({
      productId: 'pro',
      successUrl: '/dashboard?upgraded=true'
    });

    if (result.url) {
      // User will be redirected to Stripe checkout
      window.location.href = result.url;
    }
  }
</script>

{#if autumn.customer && !autumn.customer.products?.includes('pro')}
  <button onclick={upgradeToPro}>
    Upgrade to Pro
  </button>
{/if}
```

### Track Usage

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';

  const autumn = useCustomer();

  async function sendMessage(content: string) {
    // Track usage when action is performed
    const result = await autumn.track({
      featureId: 'messages',
      value: 1  // Increment by 1
    });

    if (result.success) {
      console.log('New balance:', result.balance);
      // Proceed with sending message
    }
  }
</script>
```

### Open Billing Portal

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';

  const autumn = useCustomer();

  async function manageBilling() {
    await autumn.openBillingPortal({
      returnUrl: '/dashboard'
    });
  }
</script>

<button onclick={manageBilling}>
  Manage Billing
</button>
```

### Attach & Cancel Products

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';

  const autumn = useCustomer();

  async function attachProduct(productId: string) {
    await autumn.attach({ productId });
    // Customer data automatically refetched after attach
  }

  async function cancelProduct(productId: string) {
    await autumn.cancel({ productId });
    // Customer data automatically refetched after cancel
  }
</script>
```

### Manual Refetch

If you need to manually refresh customer data (e.g., after external changes):

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';

  const autumn = useCustomer();

  async function refreshBillingData() {
    await autumn.refetch();
  }
</script>

<button onclick={refreshBillingData}>
  Refresh Billing Data
</button>
```

<details>
<summary><h2>Controlling Automatic Refetch for Performance</h2></summary>

By default, all mutation methods (`track`, `checkout`, `attach`, `cancel`, etc.) automatically refetch customer data after completion to keep your UI in sync. You can disable this behavior for performance-critical scenarios by passing a `refetch: false` option:

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';

  const autumn = useCustomer();

  async function handleActions() {
    // Default behavior: auto-refetch after each mutation
    await autumn.track({ featureId: 'messages', value: 1 });
    // Customer data is automatically refreshed

    // Batch operations: disable auto-refetch for each, then manually refetch once
    await autumn.track({ featureId: 'messages', value: 1 }, { refetch: false });
    await autumn.track({ featureId: 'uploads', value: 1 }, { refetch: false });
    await autumn.track({ featureId: 'api-calls', value: 1 }, { refetch: false });
    await autumn.refetch(); // Single refetch for all changes
  }
</script>
```

### Methods Supporting Refetch Options

All mutation methods support the optional `options` parameter:

```typescript
// All these methods accept { refetch?: boolean } as a second parameter
await autumn.check({ featureId: 'x' }, { refetch: false });
await autumn.checkout({ productId: 'pro' }, { refetch: false });
await autumn.track({ featureId: 'x', value: 1 }, { refetch: false });
await autumn.attach({ productId: 'pro' }, { refetch: false });
await autumn.cancel({ productId: 'pro' }, { refetch: false });
await autumn.createEntity({ id: 'x', name: 'X' }, { refetch: false });
await autumn.setupPayment({ successUrl: '/dashboard' }, { refetch: false });
await autumn.createReferralCode({ programId: 'x' }, { refetch: false });
await autumn.redeemReferralCode({ code: 'X' }, { refetch: false });
```

Read-only methods don't support this option.

</details>
<details>
<summary><h2>API Reference</h2></summary>

### `setupAutumn(options)`

Initialize Autumn in your root component.

**Options:**
- `convexApi: AutumnConvexApi` - Your Autumn API from Convex (e.g., `api.autumn`)

**Returns:** Autumn client instance

### `useCustomer()`

Hook to access customer data and billing operations.

**Returns:**
- `customer: Customer | null | undefined` - Current customer data
- `isLoading: boolean` - Loading state
- `error: Error | null | undefined` - Error state
- `allowed(params): LocalCheckResult` - Local access check (doesn't consume usage)
- `check(params): Promise<CheckResult>` - Server-side access check
- `checkout(params): Promise<{url?: string}>` - Initiate checkout flow (auto-refetches customer)
- `track(params): Promise<TrackResult>` - Track usage (auto-refetches customer)
- `attach(params): Promise<void>` - Attach product to customer (auto-refetches customer)
- `cancel(params): Promise<void>` - Cancel product subscription (auto-refetches customer)
- `openBillingPortal(params): Promise<BillingPortalResult>` - Open Stripe portal
- `createEntity(params): Promise<Entity>` - Create new entity (auto-refetches customer)
- `refetch(): Promise<void>` - Manually refresh customer data

</details>

