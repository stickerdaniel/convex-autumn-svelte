# Autumn SvelteKit

Reactive SvelteKit bindings for [Autumn](https://useautumn.com) billing with [Convex](https://convex.dev), featuring full SSR support.

## Features

- **Server-Side Rendering** - Fetch customer data on the server, eliminate loading states
- **Automatic Invalidation** - Mutations trigger invalidation for fresh user data
- **Server Helpers** - Utilities for server-side data fetching in load functions
- **Type Safety** - Full TypeScript support with generated types
- **All Vanilla Features** - Everything from `autumn/svelte` plus SSR

## No Global Loading State

Unlike the vanilla Svelte client, the SvelteKit client **does not expose a global `isLoading` state**. This is by design!

**Why?**

With SSR, customer data is pre-fetched on the server via your `+layout.server.ts` load function. The `_state.customer` is initialized from `getServerState()` with data that's already available. Since the data is hydrated from the server, there's no initial loading phase on the client.

**Operation-specific loading states**

For operations like `checkout()` or `track()`, you should manage local loading state in your components.

**Using the `useAutumnOperation()` helper:**

For convenience, there is a `useAutumnOperation()` helper that handles this boilerplate for you:

```svelte
<script lang="ts">
  import { useCustomer, useAutumnOperation } from '@stickerdaniel/convex-autumn-svelte/sveltekit';

  const { checkout } = useCustomer();
  const upgrade = useAutumnOperation(checkout);

  async function handleCheckout() {
    const result = await upgrade.execute({ productId: 'pro' });
    if (result?.url) window.location.href = result.url;
  }
</script>

<button disabled={upgrade.isLoading} onclick={handleCheckout}>
  {upgrade.isLoading ? 'Processing...' : 'Upgrade to Pro'}
</button>

{#if upgrade.error}
  <p class="error">{upgrade.error.message}</p>
{/if}
```

This helper automatically manages `isLoading`, `error`, and `result` states, making your components cleaner.

## Installation

```bash
bun add @stickerdaniel/convex-autumn-svelte
```

## Setup

### 1. Configure Autumn in Convex (same as vanilla Svelte)

```typescript
// convex/autumn.ts
import { Autumn } from "@useautumn/convex";
import { components } from "./_generated/api";

export const autumn = new Autumn(components.autumn, {
  secretKey: process.env.AUTUMN_SECRET_KEY ?? "",
  identify: async (ctx) => {
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

### 2. Server-Side Data Loading

Create a layout server load function to fetch customer data. Autumn delegates authentication to your auth solution (in this example, Convex Auth):

```typescript
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { createConvexAuthHandlers } from '@stickerdaniel/convex-autumn-svelte/sveltekit/server';
import { createAutumnHandlers } from '@stickerdaniel/convex-autumn-svelte/sveltekit/server';
import { api } from '$lib/convex/_generated/api';
import { PUBLIC_CONVEX_URL } from '$env/static/public';

// Create Convex Auth handlers
const authHandlers = createConvexAuthHandlers({
  convexUrl: PUBLIC_CONVEX_URL
});

// Create Autumn handlers, delegating auth to Convex Auth
const { getCustomer } = createAutumnHandlers({
  convexApi: api.autumn,
  createClient: authHandlers.createConvexHttpClient
});

export const load: LayoutServerLoad = async (event) => {
  const customer = await getCustomer(event);

  return {
    autumnState: {
      customer,
      _timeFetched: Date.now()
    }
  };
};
```

> **Note:** While this example uses Convex Auth, Autumn works with any auth solution (BetterAuth, custom, ...) by providing a client factory function. See the [createAutumnHandlers JSDoc](./server/index.ts) for examples with other auth solutions.

### 3. Client-Side Setup with SSR

Initialize Autumn in your layout component with server state:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { setupConvex } from 'convex-svelte';
  import { setupAutumn } from '@stickerdaniel/convex-autumn-svelte/sveltekit';
  import { api } from '$lib/convex/_generated/api';
  import { PUBLIC_CONVEX_URL } from '$env/static/public';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: any } = $props();

  // Setup Convex client
  setupConvex(PUBLIC_CONVEX_URL);

  // Setup Autumn with SSR support
  setupAutumn({
    convexApi: api.autumn,
    getServerState: () => data.autumnState
  });
</script>

{@render children()}
```

## Usage

### Basic Component (No Loading State!)

With SSR, your data is available immediately:

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/sveltekit';

  const { customer } = useCustomer();
</script>

<!-- No loading spinner! -->
{#if customer}
  <h1>Welcome {customer.name}!</h1>
  <p>Email: {customer.email}</p>
{/if}
```

### Feature Access with SSR

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/sveltekit';

  const { customer, allowed, check } = useCustomer();

  // Check locally (instant, no server call)
  const canUpload = $derived(
    allowed({ featureId: 'uploads' }).allowed
  );

  async function handleUpload(file: File) {
    // Check on server (tracks usage)
    const result = await check({ featureId: 'uploads' });

    if (result.allowed) {
      // Data will automatically refresh via invalidateAll()
      await uploadFile(file);
    }
  }
</script>

{#if canUpload}
  <button onclick={() => handleUpload(selectedFile)}>
    Upload File
  </button>
{:else}
  <p>Upgrade to upload more files</p>
{/if}
```

### Checkout Flow with SSR

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/sveltekit';

  const { customer, checkout } = useCustomer();

  async function upgradeToPro() {
    const result = await checkout({
      productId: 'pro',
      successUrl: '/dashboard?upgraded=true'
    });

    // Data will automatically refresh via invalidateAll()

    if (result.url) {
      window.location.href = result.url;
    }
  }

  const isPro = $derived(
    customer?.products?.some(p => p.id === 'pro') ?? false
  );
</script>

{#if !isPro}
  <button onclick={upgradeToPro}>
    Upgrade to Pro - $50/month
  </button>
{:else}
  <p>You're on the Pro plan!</p>
{/if}
```

## Server-Side Utilities

### `createAutumnHandlers(options)`

Creates server-side helpers for working with Autumn in load functions.

```typescript
import { createConvexAuthHandlers } from '@stickerdaniel/convex-autumn-svelte/sveltekit/server';
import { createAutumnHandlers } from '@stickerdaniel/convex-autumn-svelte/sveltekit/server';
import { api } from '$lib/convex/_generated/api';
import type { PageServerLoad } from './$types';

const authHandlers = createConvexAuthHandlers();

export const load: PageServerLoad = async (event) => {
  const { getCustomer, getEntity, getConvexClient } = createAutumnHandlers({
    convexApi: api.autumn,
    createClient: authHandlers.createConvexHttpClient
  });

  // Get customer data
  const customer = await getCustomer(event);

  // Get specific entity
  const entity = await getEntity(event, 'entity-123');

  // Or use the client for custom queries
  const client = await getConvexClient(event);
  const customData = await client.query(api.myCustomQuery, {});

  return { customer, entity, customData };
};
```

### `getCustomer(event)`

Fetches customer data server-side with authentication.

```typescript
const customer = await getCustomer(event);
// Returns: Customer | null
```

### `getEntity(event, entityId)`

Fetches entity data server-side.

```typescript
const entity = await getEntity(event, 'entity-123');
// Returns: Entity | null
```

### `getConvexClient(event)`

Returns the authenticated Convex HTTP client for custom server-side queries.

```typescript
const client = await getConvexClient(event);
const data = await client.query(api.myQuery, { arg: 'value' });
```

## Protected Routes

Use server-side handlers to protect routes that require specific access:

```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { createConvexAuthHandlers } from '@stickerdaniel/convex-autumn-svelte/sveltekit/server';
import { createAutumnHandlers } from '@stickerdaniel/convex-autumn-svelte/sveltekit/server';
import { api } from '$lib/convex/_generated/api';
import { redirect } from '@sveltejs/kit';

const authHandlers = createConvexAuthHandlers();

export const load: PageServerLoad = async (event) => {
  const { getCustomer, getConvexClient } = createAutumnHandlers({
    convexApi: api.autumn,
    createClient: authHandlers.createConvexHttpClient
  });

  const customer = await getCustomer(event);

  if (!customer) {
    throw redirect(302, '/login');
  }

  // Check if user has required feature
  const client = await getConvexClient(event);
  const hasAccess = await client.query(api.autumn.check, {
    featureId: 'dashboard'
  });

  if (!hasAccess.allowed) {
    throw redirect(302, '/pricing');
  }

  return { customer };
};
```

## Automatic Data Refresh

All mutation methods (`check`, `checkout`, `track`, `attach`, `cancel`, `createEntity`) automatically call `invalidate('autumn:customer')` after completion to refresh your customer data. This ensures your UI stays in sync:

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/sveltekit';

  const { customer, track } = useCustomer();

  async function sendMessage() {
    await track({ featureId: 'messages', value: 1 });
    // Customer data is automatically refreshed!
    // No need to manually call refetch()
  }

  const messageBalance = $derived(
    customer?.features?.messages?.balance ?? 0
  );
</script>

<p>Messages: {messageBalance}</p>
<button onclick={sendMessage}>Send Message</button>
```

<details>
<summary><h2>Controlling Automatic Refetch for Performance</h2></summary>

By default, all mutation methods automatically refetch customer data after completion. You can disable this behavior for performance-critical scenarios by passing a `refetch: false` option:

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/sveltekit';

  const { track, refetch } = useCustomer();

  async function handleActions() {
    // Default behavior: auto-refetch after each mutation
    await track({ featureId: 'messages', value: 1 });
    // Customer data is automatically refreshed!

    // For batch operations, disable auto-refetch for each, then manually refetch once
    await track({ featureId: 'messages', value: 1 }, { refetch: false });
    await track({ featureId: 'uploads', value: 1 }, { refetch: false });
    await track({ featureId: 'api-calls', value: 1 }, { refetch: false });
    await refetch(); // Single targeted invalidation for all changes
  }
</script>
```

### Methods Supporting Refetch Options

All mutation methods support the optional `options` parameter:

Read-only methods don't support this option.

</details>

## API Reference

### `useCustomer()`

Hook to access customer data and billing operations.

**Returns:**
- `customer: Customer | null | undefined` - Current customer data (reactive)
- `allowed(params): LocalCheckResult` - Local access check (doesn't consume usage)
- `check(params): Promise<CheckResult>` - Server-side access check
- `checkout(params): Promise<{url?: string}>` - Initiate checkout flow
- `track(params): Promise<TrackResult>` - Track usage
- `attach(params): Promise<void>` - Attach product to customer
- `cancel(params): Promise<void>` - Cancel product subscription
- `openBillingPortal(params): Promise<BillingPortalResult>` - Open Stripe portal
- `createEntity(params): Promise<Entity>` - Create new entity

**Note:** Unlike the vanilla Svelte client, SvelteKit's `useCustomer()` does **not** return `isLoading` or `error` states. See [No Global Loading State](#no-global-loading-state) for details.

See the [vanilla Svelte documentation](../svelte/README.md) for parameter details and complete type definitions.

### `useAutumnOperation(operation, defaultOptions?)`

Helper function for managing loading, error, and result state for Autumn operations.

**Parameters:**
- `operation: (params, options?) => Promise<TResult>` - The Autumn operation to wrap (e.g., `autumn.checkout`)
- `defaultOptions?: RefetchOptions` - Default refetch options to apply to all executions

**Returns:**
- `execute: (params, executeOptions?) => Promise<TResult | null>` - Execute the operation with params and optional per-execution options
- `isLoading: boolean` - Reactive loading state (true during execution)
- `error: Error | null` - Reactive error state (null on success, Error on failure)
- `result: TResult | null` - Reactive result state (null until first successful execution)
- `reset: () => void` - Reset all state to initial values

**Examples:**

```svelte
<!-- Basic usage -->
<script lang="ts">
  import { useCustomer, useAutumnOperation } from '@stickerdaniel/convex-autumn-svelte/sveltekit';

  const autumn = useCustomer();
  const upgrade = useAutumnOperation(autumn.checkout);

  async function handleUpgrade() {
    const result = await upgrade.execute({ productId: 'pro' });
    if (result?.url) window.location.href = result.url;
  }
</script>

<button disabled={upgrade.isLoading} onclick={handleUpgrade}>
  {upgrade.isLoading ? 'Processing...' : 'Upgrade to Pro'}
</button>

{#if upgrade.error}
  <div class="error">{upgrade.error.message}</div>
{/if}
```

```svelte
<!-- Batch operations with disabled auto-refetch -->
<script lang="ts">
  import { useCustomer, useAutumnOperation } from '@stickerdaniel/convex-autumn-svelte/sveltekit';

  const autumn = useCustomer();
  const track = useAutumnOperation(autumn.track, { refetch: false });

  async function sendBatch() {
    await track.execute({ featureId: 'messages', value: 1 });
    await track.execute({ featureId: 'uploads', value: 1 });
    await autumn.refetch();
  }
</script>

<button disabled={track.isLoading} onclick={sendBatch}>
  {track.isLoading ? 'Sending...' : 'Send Batch'}
</button>

{#if track.error}
  <p class="error">Batch failed: {track.error.message}</p>
{/if}
```

**When to use:**
- User-triggered operations that need loading states (checkout, track, attach, cancel)
- Operations where you want automatic error handling
- Batch operations with shared loading/error state

**Using `reset()`:**

Use `reset()` to manually clear all state (loading, error, result) when needed, such as dismissing errors or clearing success messages before new operations.

**Note:** The `execute` function returns `null` on error (check `error` state) and the actual result on success (stored in `result` state for reactive access).

### Additional Features vs Vanilla Svelte

- **SSR Hydration**: Customer data pre-loaded on the server
- **Automatic Invalidation**: Mutations trigger `invalidateAll()`
- **Server Helpers**: `getCustomer()`, `getEntity()`, `createConvexClient()`
- **No Global Loading State**: Data is pre-fetched on the server (see above)

</details>

<details>
<summary><h2>Migration from Vanilla Svelte</h2></summary>

Minimal changes required:

```diff
- import { setupAutumn, useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';
+ import { setupAutumn, useCustomer } from '@stickerdaniel/convex-autumn-svelte/sveltekit';

  setupAutumn({
    convexApi: api.autumn,
+   getServerState: () => data.autumnState
  });
```

Update your components to remove global loading/error states:

```diff
  <script lang="ts">
-   const { customer, isLoading, error } = useCustomer();
+   const { customer } = useCustomer();
  </script>

- {#if isLoading}
-   <p>Loading...</p>
- {:else if error}
-   <p>Error: {error.message}</p>
- {:else if customer}
+ {#if customer}
    <h1>Welcome {customer.name}!</h1>
  {/if}
```

Add server-side data fetching:

```typescript
// +layout.server.ts
import { createConvexAuthHandlers } from '@stickerdaniel/convex-autumn-svelte/sveltekit/server';
import { createAutumnHandlers } from '@stickerdaniel/convex-autumn-svelte/sveltekit/server';
import { api } from '$lib/convex/_generated/api';

const authHandlers = createConvexAuthHandlers();

export const load = async (event) => {
  const { getCustomer } = createAutumnHandlers({
    convexApi: api.autumn,
    createClient: authHandlers.createConvexHttpClient
  });
  const customer = await getCustomer(event);

  return {
    autumnState: { customer, _timeFetched: Date.now() }
  };
};
```

</details>