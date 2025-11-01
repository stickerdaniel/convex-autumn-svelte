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

## Core Concepts

### SSR Hydration Flow

SvelteKit pre-loads customer data on the server, eliminating initial loading states:

1. **Server**: `+layout.server.ts` fetches customer data via Convex HTTP client
2. **Server**: Data is passed to client as `autumnState`
3. **Client**: `setupAutumn()` hydrates state from server data
4. **Client**: `$effect` syncs reactive state with server updates

```typescript
// Server: +layout.server.ts
export const load: LayoutServerLoad = async (event) => {
  const customer = await getCustomer(event);
  return {
    autumnState: { customer, _timeFetched: Date.now() }
  };
};
```

```svelte
<!-- Client: +layout.svelte -->
<script lang="ts">
  setupAutumn({
    convexApi: api.autumn,
    getServerState: () => data.autumnState,  // Hydrate from server
    invalidate  // Auto-refresh after mutations
  });
</script>
```

### Automatic Invalidation

When you pass the `invalidate` function to `setupAutumn()`, all mutation methods automatically trigger SvelteKit's data refetching:

```svelte
<script lang="ts">
  const { track } = useCustomer();

  async function sendMessage() {
    await track({ featureId: 'messages', value: 1 });
    // Automatically calls: invalidate('autumn:customer')
    // Server load function re-runs, fresh data hydrates
  }
</script>
```

**Without `invalidate`:** You must manually call `refetch()` after mutations.

### Svelte 5 Reactivity with SSR

This library uses Svelte 5 runes designed for SSR:

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/sveltekit';

  // No destructuring needed - customer is already reactive
  const { customer } = useCustomer();

  // Use $derived for computed values
  const messageCount = $derived(
    customer?.features?.messages?.balance ?? 0
  );
</script>

<!-- No loading state - data is already available from SSR -->
{#if customer}
  <p>You have {messageCount} messages remaining</p>
{/if}
```

**Key difference from vanilla Svelte:** No `isLoading` or `error` states because SSR pre-loads data.

### Two Operation Patterns

Like the vanilla client, SvelteKit supports two ways to call Autumn operations:

**1. Client Wrapper (Auto-Invalidation)**
```svelte
<script lang="ts">
  const { track } = useCustomer();

  async function trackUsage() {
    await track({ featureId: 'messages', value: 1 });
    // Automatically calls invalidate('autumn:customer')
    // Server re-fetches, UI updates
  }
</script>
```

**2. Server-Side (Atomicity)**
```typescript
// convex/messages.ts
export const send = action({
  handler: async (ctx, { body }) => {
    await autumn.track(ctx, { featureId: 'messages', value: 1 });
    // No auto-invalidation - client must call refetch()
  }
});
```

```svelte
<script lang="ts">
  const { refetch } = useCustomer();

  async function sendMessage() {
    await client.action(api.messages.send, { body });
    await refetch(); // Manual invalidation required
  }
</script>
```

See [Server-Side vs Client-Side Operations](#server-side-vs-client-side-operations) for detailed guidance.

### Local vs Server-Side Feature Checks

**Local checks** (`allowed()`) are instant and don't consume usage:

```svelte
<script lang="ts">
  const { customer, allowed } = useCustomer();

  const canUpload = $derived(
    allowed({ featureId: 'uploads' }).allowed
  );
</script>

<button disabled={!canUpload}>Upload File</button>
```

**Server-side checks** (`check()`) consume usage and validate on the server:

```svelte
<script lang="ts">
  const { check } = useCustomer();

  async function handleUpload(file: File) {
    const result = await check({ featureId: 'uploads' });
    if (result.allowed) {
      // Usage tracked, proceed
    }
  }
</script>
```

### Authentication Delegation

Autumn delegates authentication to your auth solution. The `createAutumnHandlers` accepts a `createClient` function that returns an authenticated Convex HTTP client:

```typescript
// Example: Convex Auth
const authHandlers = createConvexAuthHandlers({ convexUrl: PUBLIC_CONVEX_URL });

const { getCustomer } = createAutumnHandlers({
  convexApi: api.autumn,
  createClient: authHandlers.createConvexHttpClient  // Returns authenticated client
});
```

```typescript
// Example: Custom auth with cookies
const { getCustomer } = createAutumnHandlers({
  convexApi: api.autumn,
  createClient: async (event) => {
    const token = event.cookies.get('auth_token');
    return new ConvexHttpClient(PUBLIC_CONVEX_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
});
```

The `identify` function in your `convex/autumn.ts` receives the authenticated context and determines the current customer.

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

### 3. Client-Side Setup with SSR and Auto-Invalidation

Initialize Autumn in your layout component with server state and pass the `invalidate` function for automatic data refetching:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { setupConvex } from 'convex-svelte';
  import { setupAutumn } from '@stickerdaniel/convex-autumn-svelte/sveltekit';
  import { invalidate } from '$app/navigation';
  import { api } from '$lib/convex/_generated/api';
  import { PUBLIC_CONVEX_URL } from '$env/static/public';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: any } = $props();

  // Setup Convex client
  setupConvex(PUBLIC_CONVEX_URL);

  // Setup Autumn with SSR support and auto-invalidation
  setupAutumn({
    convexApi: api.autumn,
    getServerState: () => data.autumnState,
    invalidate  // Pass SvelteKit's invalidate function for auto-refetch
  });
</script>

{@render children()}
```

> **Note:** Passing the `invalidate` function enables automatic data refetching after mutations. If you don't pass it, mutations will still work but won't automatically refresh customer data. You'll need to manually call `refetch()` or reload the page to see updated data.

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

## Server-Side vs Client-Side Operations

Autumn operations can be called in two distinct ways in SvelteKit. Understanding the differences is critical for building reliable billing features with proper SSR support.

### Pattern 1: Client Wrapper (Auto-Invalidation)

The client wrapper methods (`track()`, `check()`, `checkout()`, etc.) provide automatic SvelteKit data invalidation:

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/sveltekit';

  const { track } = useCustomer();

  async function sendMessage(body: string) {
    // Track usage using client wrapper
    const result = await track({ featureId: 'messages', value: 1 });

    if (result.success) {
      // Automatically calls: invalidate('autumn:customer')
      // Server load function re-runs, fresh data hydrates
      console.log('New balance:', result.balance);
    }
  }
</script>
```

**Characteristics:**
- Automatic SvelteKit invalidation via `invalidate('autumn:customer')`
- Server load function re-runs, fresh data hydrates to client
- Simple API - no context needed
- Separate from other operations (not atomic)
- Best for standalone tracking, analytics, or simple workflows

### Pattern 2: Server-Side (Atomicity + Control)

Server-side operations using `autumn.track(ctx, ...)` in your Convex actions provide atomicity and transaction control:

```typescript
// convex/messages.ts
import { action } from './_generated/server';
import { autumn } from './autumn';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

export const send = action({
  args: { body: v.string() },
  handler: async (ctx, { body }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    // Step 1: Check access
    const { data: checkData } = await autumn.check(ctx, { featureId: 'messages' });
    if (!checkData?.allowed) {
      throw new Error('Message limit reached');
    }

    // Step 2: Insert message (database mutation)
    await ctx.runMutation(internal.messages.insert, { body, userId });

    // Step 3: Track usage - all atomic!
    await autumn.track(ctx, { featureId: 'messages', value: 1 });

    // Note: No auto-invalidation happens here
  }
});
```

```svelte
<script lang="ts">
  import { useConvexClient } from 'convex-svelte';
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/sveltekit';
  import { api } from '$lib/convex/_generated/api';

  const client = useConvexClient();
  const { refetch } = useCustomer();

  async function sendMessage(body: string) {
    // Call server-side action
    await client.action(api.messages.send, { body });

    // Manual refetch/invalidation required!
    await refetch();
  }
</script>
```

**Characteristics:**
- Atomic with database operations (check + action + track together)
- Full transaction control - all succeed or all fail
- Requires manual `refetch()` from client
- SSR-friendly - works in server load functions too
- Best for critical billing operations, multi-step workflows

### SSR Considerations

**Client Wrapper Pattern:**
- Works client-side only (requires browser context)
- Triggers SvelteKit invalidation automatically
- Data flows: Client → Convex Action → Client invalidation → Server load → Client hydration

**Server-Side Pattern:**
- Works in both server load functions and client actions
- No automatic invalidation (you control when data refreshes)
- Data flows: Client/Server → Convex Action → Manual invalidation → Server load → Client hydration

### When to Use Each Pattern

**Use Client Wrapper When:**

- Tracking standalone events (page views, button clicks, analytics)
- No database writes are involved in the same operation
- Convenience and auto-refresh are priorities
- Operation doesn't need to be atomic with other actions
- Client-side only operation

**Use Server-Side When:**

- Need atomicity (check access + perform action + track usage must succeed or fail together)
- Critical billing operations where consistency matters
- Complex multi-step backend logic
- Performing database mutations alongside billing operations
- Need server-side data fetching in load functions

### Real Example: Atomic Message Send with SSR

The demo app uses the server-side pattern for message sending to ensure atomicity:

```typescript
// convex/messages.ts - Server-side action
export const send = action({
  args: { body: v.string() },
  handler: async (ctx, { body }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    // Step 1: Check feature access
    const { data: checkData } = await autumn.check(ctx, { featureId: "messages" });
    if (!checkData?.allowed) {
      throw new Error("Message limit reached. Upgrade to Pro!");
    }

    // Step 2: Insert message (database mutation)
    await ctx.runMutation(internal.messages.insertMessage, { body, userId });

    // Step 3: Track usage
    await autumn.track(ctx, { featureId: "messages", value: 1 });

    // All three steps are atomic - if any fails, none succeed
  }
});
```

```svelte
<!-- src/lib/demo/Chat/Chat.svelte - SvelteKit component -->
<script lang="ts">
  import { useConvexClient } from 'convex-svelte';
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/sveltekit';
  import { api } from '$lib/convex/_generated/api';

  const client = useConvexClient();
  const { refetch } = useCustomer();

  let newMessageText = $state('');

  async function handleSubmit(event: Event) {
    event.preventDefault();

    try {
      // Call atomic server-side action
      await client.action(api.messages.send, { body: newMessageText });

      // Manually trigger SvelteKit invalidation
      // This re-runs +layout.server.ts load function
      // Fresh customer data hydrates to client
      await refetch();

      newMessageText = '';
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }
</script>
```

**Why this pattern with SSR?**

Without atomicity, race conditions could occur:
- User might send a message after balance check but before tracking
- Message could be saved but usage not tracked (billing loss)
- Usage could be tracked but message save fails (user charged incorrectly)

The server-side pattern ensures all three operations (check, save, track) succeed or fail together, and the SSR architecture ensures the UI always shows accurate data from the server.

### Architecture Decision Guide

Ask yourself these questions:

1. **Does this operation modify the database?**
   - Yes → Use server-side pattern for atomicity
   - No → Client wrapper is fine

2. **Is accurate billing critical for this operation?**
   - Yes → Use server-side pattern
   - No → Client wrapper is fine

3. **Do multiple steps need to succeed/fail together?**
   - Yes → Use server-side pattern
   - No → Client wrapper is fine

4. **Do you need this data in a server load function?**
   - Yes → Use server-side pattern (or server utilities)
   - No → Client wrapper is fine

5. **Is this just tracking analytics/metrics?**
   - Yes → Client wrapper is simpler
   - No → Consider server-side if critical

**Rule of thumb:** When in doubt, use the server-side pattern for operations involving money or user limits, and leverage SSR for instant, accurate UI.

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

All mutation methods (`check`, `checkout`, `track`, `attach`, `cancel`, `createEntity`) automatically call `invalidate('autumn:customer')` after completion to refresh your customer data **when the `invalidate` function is passed to `setupAutumn()`**. This ensures your UI stays in sync:

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
- `customer: Customer | null` - Current customer data (reactive, hydrated from SSR)
- `allowed(params): LocalCheckResult` - Local access check (doesn't consume usage)
- `check(params, options?): Promise<CheckResult>` - Server-side access check (auto-invalidates)
- `checkout(params, options?): Promise<{url?: string}>` - Initiate checkout flow (auto-invalidates)
- `track(params, options?): Promise<TrackResult>` - Track usage (auto-invalidates)
- `attach(params, options?): Promise<void>` - Attach product to customer (auto-invalidates)
- `cancel(params, options?): Promise<void>` - Cancel product subscription (auto-invalidates)
- `openBillingPortal(params): Promise<BillingPortalResult>` - Open Stripe portal
- `createEntity(params, options?): Promise<Entity>` - Create new entity (auto-invalidates)
- `setupPayment(params, options?): Promise<SetupPaymentResult>` - Setup payment method (auto-invalidates)
- `createReferralCode(params, options?): Promise<CreateReferralCodeResult>` - Create referral code (auto-invalidates)
- `redeemReferralCode(params, options?): Promise<RedeemReferralCodeResult>` - Redeem referral code (auto-invalidates)
- `listProducts(): Promise<Product[]>` - List all available products
- `usage(params): Promise<SetUsageResult>` - Set usage to absolute value
- `query(params): Promise<QueryResult>` - Query customer data
- `refetch(): Promise<void>` - Manually trigger invalidation

**Note:** Unlike the vanilla Svelte client, SvelteKit's `useCustomer()` does **not** return `isLoading` or `error` states. See [No Global Loading State](#no-global-loading-state) for details.

### Method Parameters

**`allowed(params: CheckParams): LocalCheckResult`**

Local, instant feature access check that doesn't consume usage.

```typescript
params: {
  featureId: string;           // Feature ID to check
  requiredBalance?: number;    // Required balance (default: 1)
  entityId?: string;          // Optional entity ID for entity-based billing
}

returns: {
  allowed: boolean;           // Whether access is allowed
  reason?: string;            // Reason if not allowed
}
```

**`check(params: CheckParams, options?: RefetchOptions): Promise<CheckResult>`**

Server-side feature access check that consumes usage.

```typescript
params: {
  featureId: string;           // Feature ID to check
  requiredBalance?: number;    // Required balance (default: 1)
  value?: number;             // Usage amount to consume (default: 1)
  entityId?: string;          // Optional entity ID for entity-based billing
}

options: {
  refetch?: boolean;          // Auto-invalidate (default: true)
}

returns: {
  allowed: boolean;           // Whether access is allowed
  reason?: string;            // Reason if not allowed
  balance?: number;           // Remaining balance after check
}
```

**`checkout(params: CheckoutParams, options?: RefetchOptions): Promise<{url?: string}>`**

Initiate Stripe checkout flow.

```typescript
params: {
  productId: string;                    // Product ID to checkout
  successUrl?: string;                  // Redirect URL on success
  cancelUrl?: string;                   // Redirect URL on cancel
  dialog?: (url: string) => void;       // Custom dialog handler
  entityId?: string;                    // Optional entity ID
}

options: {
  refetch?: boolean;                    // Auto-invalidate (default: true)
}

returns: {
  url?: string;                         // Stripe checkout URL
}
```

**`track(params: TrackParams, options?: RefetchOptions): Promise<TrackResult>`**

Track feature usage (increments/decrements usage).

```typescript
params: {
  featureId: string;          // Feature ID to track
  value: number;              // Usage amount (positive to increment, negative to decrement)
  entityId?: string;          // Optional entity ID for entity-based billing
}

options: {
  refetch?: boolean;          // Auto-invalidate (default: true)
}

returns: {
  success: boolean;           // Whether tracking succeeded
  balance?: number;           // Remaining balance after tracking
}
```

**`attach(params: AttachParams, options?: RefetchOptions): Promise<void>`**

Attach a product subscription to the customer.

```typescript
params: {
  productId: string;          // Product ID to attach
  entityId?: string;          // Optional entity ID for entity-based billing
}

options: {
  refetch?: boolean;          // Auto-invalidate (default: true)
}
```

**`cancel(params: CancelParams, options?: RefetchOptions): Promise<void>`**

Cancel a product subscription.

```typescript
params: {
  productId: string;          // Product ID to cancel
  entityId?: string;          // Optional entity ID for entity-based billing
}

options: {
  refetch?: boolean;          // Auto-invalidate (default: true)
}
```

**`openBillingPortal(params?: BillingPortalParams): Promise<BillingPortalResult>`**

Open Stripe billing portal in new window.

```typescript
params: {
  returnUrl?: string;         // Return URL after portal session
  entityId?: string;          // Optional entity ID for entity-based billing
}

returns: {
  url: string;                // Billing portal URL
}
```

**`createEntity(params: CreateEntityParams, options?: RefetchOptions): Promise<Entity>`**

Create a new entity for multi-tenant billing.

```typescript
params: {
  id: string;                 // Entity ID
  name?: string;              // Entity name
  metadata?: Record<string, any>;  // Optional metadata
}

options: {
  refetch?: boolean;          // Auto-invalidate (default: true)
}

returns: {
  id: string;                 // Entity ID
  name?: string;              // Entity name
  features?: Record<string, Feature>;  // Entity features
  products?: Product[];       // Attached products
}
```

**`setupPayment(params?: SetupPaymentParams, options?: RefetchOptions): Promise<SetupPaymentResult>`**

Setup payment method without immediate charge.

```typescript
params: {
  successUrl?: string;        // Redirect URL on success
  cancelUrl?: string;         // Redirect URL on cancel
  entityId?: string;          // Optional entity ID
}

options: {
  refetch?: boolean;          // Auto-invalidate (default: true)
}

returns: {
  url: string;                // Setup session URL
}
```

**`createReferralCode(params: CreateReferralCodeParams, options?: RefetchOptions): Promise<CreateReferralCodeResult>`**

Create a referral code for the customer.

```typescript
params: {
  programId: string;          // Referral program ID
  entityId?: string;          // Optional entity ID
}

options: {
  refetch?: boolean;          // Auto-invalidate (default: true)
}

returns: {
  code: string;               // Generated referral code
  programId: string;          // Referral program ID
}
```

**`redeemReferralCode(params: RedeemReferralCodeParams, options?: RefetchOptions): Promise<RedeemReferralCodeResult>`**

Redeem a referral code and apply rewards.

```typescript
params: {
  code: string;               // Referral code to redeem
  entityId?: string;          // Optional entity ID
}

options: {
  refetch?: boolean;          // Auto-invalidate (default: true)
}

returns: {
  success: boolean;           // Whether redemption succeeded
  reward?: any;               // Reward details
}
```

**`listProducts(): Promise<Product[]>`**

List all available products.

```typescript
returns: Product[]            // Array of available products

Product: {
  id: string;                 // Product ID
  name: string;               // Product name
  price?: number;             // Price in cents
  interval?: string;          // Billing interval (month, year, etc.)
  features?: Record<string, Feature>;  // Product features
}
```

**`usage(params: SetUsageParams): Promise<SetUsageResult>`**

Set usage to an absolute value (for syncing external data).

```typescript
params: {
  featureId: string;          // Feature ID
  value: number;              // Absolute usage value to set
  entityId?: string;          // Optional entity ID
}

returns: {
  success: boolean;           // Whether operation succeeded
  balance?: number;           // New balance after setting
}
```

**`query(params: QueryParams): Promise<QueryResult>`**

Query customer data with custom parameters.

```typescript
params: {
  expand?: Record<string, boolean>;  // Fields to expand
  entityId?: string;                 // Optional entity ID
}

returns: QueryResult          // Custom query result
```

**`refetch(): Promise<void>`**

Manually trigger SvelteKit invalidation to refresh customer data.

```typescript
// Calls invalidate('autumn:customer') internally
// Server load function re-runs, fresh data hydrates to client
```

### Important Notes

**Auto-Invalidation:**

All mutation methods (`check`, `checkout`, `track`, `attach`, `cancel`, `createEntity`, `setupPayment`, `createReferralCode`, `redeemReferralCode`) accept an optional second parameter `options` with a `refetch` boolean (default: `true`). Pass `{ refetch: false }` to disable automatic invalidation for performance optimization in batch operations.

**Server-Side Pattern:**

These client wrapper methods automatically trigger SvelteKit invalidation after operations. However, if you call Autumn methods directly in your Convex actions (e.g., `autumn.track(ctx, ...)`), you must manually call `refetch()` from your client code. See [Server-Side vs Client-Side Operations](#server-side-vs-client-side-operations) for details.

```typescript
// Client wrapper - auto-invalidation
await track({ featureId: 'x', value: 1 }); // Invalidates automatically

// Server-side - manual invalidation required
await client.action(api.myAction, { ... }); // Contains autumn.track(ctx, ...)
await refetch(); // Must call manually
```

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
+ import { invalidate } from '$app/navigation';

  setupAutumn({
    convexApi: api.autumn,
+   getServerState: () => data.autumnState,
+   invalidate  // Enable automatic data refetching
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