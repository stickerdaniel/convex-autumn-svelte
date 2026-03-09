# Run the live harness tests

## Test suites

This directory contains live Playwright coverage for the dedicated `__e2e` harness routes:

- `svelte-wrapper.spec.ts` - Vanilla Svelte wrapper flows
- `sveltekit-wrapper.spec.ts` - SvelteKit wrapper flows and mutation invalidation
- `server-handlers.spec.ts` - `createAutumnHandlers()` server-side behavior
- `live-redirects.spec.ts` - Real redirect and popup flows for Stripe-facing actions

## Running tests

### Run all live tests
```bash
bun run test:e2e
```

### Run a single spec
```bash
playwright test e2e/sveltekit-wrapper.spec.ts
```

## Prerequisites
1. Install dependencies:
   ```bash
   bun install
   ```
2. Set the required environment variables in your local shell or CI:
   ```bash
   export ENABLE_E2E_HARNESS=1
   export PUBLIC_E2E_TEST=1
   export AUTH_E2E_TEST_SECRET_PRIMARY=primary-secret
   export AUTH_E2E_TEST_SECRET_SECONDARY=secondary-secret
   export AUTUMN_REFERRAL_PROGRAM_ID=default
   ```
3. Bootstrap the secret-backed users:
   ```bash
   bunx convex run tests:init
   ```

## Harness routes

- `/__e2e/svelte`
- `/__e2e/sveltekit`
- `/__e2e/server`

Every harness action renders structured JSON into `data-testid` panels so the tests assert wrapper behavior directly instead of relying on demo page copy or CSS selectors.
