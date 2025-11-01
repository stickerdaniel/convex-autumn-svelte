# Autumn Svelte

Reactive Svelte 5 bindings for [Autumn](https://useautumn.com) billing with [Convex](https://convex.dev).

## Features

- **Customer Data Management** - Manual state management with automatic refetch after mutations
- **TypeScript Support** - Full type safety with generated Convex types
- **Billing Operations** - Check access, initiate checkout, track usage
- **Feature Access Control** - Local and server-side access checks
- **Entity Billing** - Support for entity-based billing

> **Note:** This vanilla Svelte client uses manual state management (not reactive queries) because Autumn operations are Actions (not Queries). Customer data is fetched once on initialization and automatically refetched after mutations. For full SSR support with automatic invalidation, use the [SvelteKit version](../sveltekit/README.md).

## Core Concepts

### Manual State Management

Unlike traditional Convex queries, Autumn operations are Actions that call external APIs (Stripe). This means they cannot use reactive queries. Instead, this client:

- Fetches customer data once on initialization
- Stores it in reactive `$state`
- Automatically refetches after mutations (track, checkout, attach, etc.)
- Exposes loading and error states

### Svelte 5 Reactivity

This library uses Svelte 5 runes for reactivity:

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';

  // Don't destructure - preserve reactivity
  const autumn = useCustomer();

  // Use $derived for computed values
  const canSend = $derived(
    autumn.allowed({ featureId: 'messages' }).allowed
  );
</script>

{#if autumn.isLoading}
  <p>Loading...</p>
{:else if autumn.customer}
  <p>Welcome {autumn.customer.name}!</p>
{/if}
```

**Important:** Always use the `autumn` object directly (not destructured) to preserve reactivity.

### Two Operation Patterns

You can call Autumn operations in two ways:

**1. Client Wrapper (Convenience)**
```svelte
<script lang="ts">
  const autumn = useCustomer();

  async function trackUsage() {
    await autumn.track({ featureId: 'messages', value: 1 });
    // Customer data automatically refetched
  }
</script>
```

**2. Server-Side (Atomicity)**
```typescript
// In your Convex action (convex/myAction.ts)
import { autumn } from './autumn';

export const myAction = action({
  handler: async (ctx) => {
    await autumn.track(ctx, { featureId: 'messages', value: 1 });
    // No auto-refetch - client must call refetch()
  }
});
```

See [Server-Side vs Client-Side Operations](#server-side-vs-client-side-operations) for detailed guidance.

### Local vs Server-Side Feature Checks

**Local checks** (`allowed()`) are instant but don't consume usage:

```svelte
<script lang="ts">
  const autumn = useCustomer();
  const canUpload = $derived(autumn.allowed({ featureId: 'uploads' }).allowed);
</script>

<button disabled={!canUpload}>Upload</button>
```

**Server-side checks** (`check()`) consume usage and validate on the server:

```svelte
<script lang="ts">
  async function handleUpload() {
    const result = await autumn.check({ featureId: 'uploads' });
    if (result.allowed) {
      // Usage tracked, proceed with upload
    }
  }
</script>
```

### Authentication

Autumn delegates authentication to your Convex setup. The `identify` function in your `autumn.ts` determines the current customer:

```typescript
// convex/autumn.ts
export const autumn = new Autumn(components.autumn, {
  secretKey: process.env.AUTUMN_SECRET_KEY ?? "",
  identify: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return null;

    return {
      customerId: user.subject,
      customerData: { name: user.name, email: user.email }
    };
  }
});
```

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

## Server-Side vs Client-Side Operations

Autumn operations can be called in two distinct ways, each with different trade-offs. Understanding when to use each pattern is critical for building reliable billing features.

### Pattern 1: Client Wrapper (Convenience + Auto-Refetch)

The client wrapper methods (`track()`, `check()`, `checkout()`, etc.) provide convenience and automatic data synchronization:

```svelte
<script lang="ts">
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';

  const autumn = useCustomer();

  async function sendMessage(body: string) {
    // Track usage using client wrapper
    const result = await autumn.track({ featureId: 'messages', value: 1 });

    if (result.success) {
      // Customer data automatically refetched
      console.log('New balance:', result.balance);
    }
  }
</script>
```

**Characteristics:**
- Automatic customer data refresh after operation
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

export const send = action({
  args: { body: v.string() },
  handler: async (ctx, { body }) => {
    // Check access
    const { data: checkData } = await autumn.check(ctx, { featureId: 'messages' });
    if (!checkData?.allowed) {
      throw new Error('Message limit reached');
    }

    // Insert message
    await ctx.runMutation(internal.messages.insert, { body });

    // Track usage - all atomic!
    await autumn.track(ctx, { featureId: 'messages', value: 1 });

    // Note: No auto-refetch happens here
  }
});
```

```svelte
<script lang="ts">
  import { useConvexClient } from 'convex-svelte';
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';
  import { api } from './convex/_generated/api';

  const client = useConvexClient();
  const autumn = useCustomer();

  async function sendMessage(body: string) {
    // Call server-side action
    await client.action(api.messages.send, { body });

    // Manual refetch required!
    await autumn.refetch();
  }
</script>
```

**Characteristics:**
- Atomic with database operations (check + action + track together)
- Full transaction control
- Requires manual `refetch()` from client
- Best for critical billing operations, multi-step workflows

### When to Use Each Pattern

**Use Client Wrapper When:**

- Tracking standalone events (page views, button clicks, analytics)
- No database writes are involved in the same operation
- Convenience and auto-refresh are priorities
- Operation doesn't need to be atomic with other actions

**Use Server-Side When:**

- Need atomicity (check access + perform action + track usage must succeed or fail together)
- Critical billing operations where consistency matters
- Complex multi-step backend logic
- Performing database mutations alongside billing operations

### Real Example: Atomic Message Send

The demo app in this repository uses the server-side pattern for message sending to ensure atomicity:

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
<!-- src/lib/demo/Chat/Chat.svelte - Client component -->
<script lang="ts">
  import { useConvexClient } from 'convex-svelte';
  import { useCustomer } from '@stickerdaniel/convex-autumn-svelte/svelte';
  import { api } from '$lib/convex/_generated/api';

  const client = useConvexClient();
  const { refetch } = useCustomer();

  async function handleSubmit(event: Event) {
    event.preventDefault();

    try {
      // Call atomic server-side action
      await client.action(api.messages.send, { body: newMessageText });

      // Manually refetch customer data to see updated balance
      await refetch();

      newMessageText = '';
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }
</script>
```

**Why this pattern?**

Without atomicity, race conditions could occur:
- User might send a message after balance check but before tracking
- Message could be saved but usage not tracked (billing loss)
- Usage could be tracked but message save fails (user charged incorrectly)

The server-side pattern ensures all three operations (check, save, track) succeed or fail together.

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

4. **Is this just tracking analytics/metrics?**
   - Yes → Client wrapper is simpler
   - No → Consider server-side if critical

**Rule of thumb:** When in doubt, use the server-side pattern for operations involving money or user limits.

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
- `check(params, options?): Promise<CheckResult>` - Server-side access check (auto-refetches customer)
- `checkout(params, options?): Promise<{url?: string}>` - Initiate checkout flow (auto-refetches customer)
- `track(params, options?): Promise<TrackResult>` - Track usage (auto-refetches customer)
- `attach(params, options?): Promise<void>` - Attach product to customer (auto-refetches customer)
- `cancel(params, options?): Promise<void>` - Cancel product subscription (auto-refetches customer)
- `openBillingPortal(params): Promise<BillingPortalResult>` - Open Stripe portal
- `createEntity(params, options?): Promise<Entity>` - Create new entity (auto-refetches customer)
- `refetch(): Promise<void>` - Manually refresh customer data

**Important Notes:**

All mutation methods (`check`, `checkout`, `track`, `attach`, `cancel`, `createEntity`) accept an optional second parameter `options` with a `refetch` boolean (default: `true`). Pass `{ refetch: false }` to disable automatic refetching for performance optimization in batch operations.

**Server-Side Pattern:**

These client wrapper methods automatically refetch customer data after operations. However, if you call Autumn methods directly in your Convex actions (e.g., `autumn.track(ctx, ...)`), you must manually call `refetch()` from your client code. See [Server-Side vs Client-Side Operations](#server-side-vs-client-side-operations) for details.

```typescript
// Client wrapper - auto-refetch
await autumn.track({ featureId: 'x', value: 1 }); // Refetches automatically

// Server-side - manual refetch required
await client.action(api.myAction, { ... }); // Contains autumn.track(ctx, ...)
await autumn.refetch(); // Must call manually
```

</details>

