# Run the e2e tests

## Test Suites

This directory contains e2e tests for Autumn billing (pure read operations):

- `customer-data.spec.ts` - Customer data fetching and display
- `list-products.spec.ts` - Product catalog listing
- `query.spec.ts` - Usage history queries (30-day range)
- `check.spec.ts` - Feature access and usage status checks
- `get-entity.spec.ts` - Entity retrieval by ID

## Running Tests

### Run All Tests
```bash
bun run test:e2e
# or
playwright test
```

### Run Specific Test Files

**Individual test file:**
```bash
playwright test list-products.spec.ts
```

**Multiple test files:**
```bash
playwright test customer-data.spec.ts check.spec.ts
```

**Pattern matching:**
```bash
playwright test query
```

## Prerequisites

### General Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your Convex deployment for auth ([instructions](https://labs.convex.dev/auth/setup/manual))

3. Create a test user:
   ```bash
   npx convex run tests:init
   ```

4. Set up the auth secret:
   ```bash
   npx convex env set AUTH_E2E_TEST_SECRET <your-secret>
   ```

### Autumn-Specific Prerequisites

The Autumn billing tests require products to be configured in your Autumn dashboard:

1. **Products Required:**
   - `free` - Free tier (10 messages/month)
   - `pro` - Pro tier (999,999 messages/month, $10/month)

2. **Features Required:**
   - `messages` - Message usage tracking feature

3. **Configuration:**
   These are defined in `autumn.config.ts` and should be synced to your Autumn dashboard.

4. **Optional (for entity tests):**
   To enable the skipped entity test, create a test entity and set:
   ```bash
   export TEST_ENTITY_ID=your-entity-id
   ```

## Test Coverage

### Pure Read Operations Covered (5/14 Autumn APIs)

**Covered:**
1. Customer data retrieval (`createCustomer` with `errorOnNotFound: false`)
2. `listProducts` - Product catalog listing
3. `query` - Historical usage data queries
4. `check` - Feature access and usage status checks
5. `getEntity` - Entity retrieval by ID

**Not Covered (State-Changing Operations):**
- `track` - Usage tracking (writes data)
- `cancel` - Subscription cancellation (writes data)
- `attach` - Product attachment (writes data)
- `checkout` - Checkout session creation (external redirect)
- `setupPayment` - Payment setup (external redirect)
- `billingPortal` - Billing portal access (external redirect)
- `createReferralCode` - Referral code creation (writes data)
- `redeemReferralCode` - Referral code redemption (writes data)
- `createEntity` - Entity creation (writes data)

## Advanced Usage

### The mostly automated way

After an `bun install`, run `bun test`.
This tests against the most recently published official binary.

### The more manual way

The following instructions require some pre-work, but once you've done the first couple steps once
you can skip to running the test command at the end.

1. Clone [convex-backend](https://github.com/get-convex/convex-backend)

2. Follow the instructions in its [README](https://github.com/get-convex/convex-backend/blob/main/README.md) to get it building

3. From the project directory, run:
   ```bash
   CONVEX_LOCAL_BACKEND_PATH=/path/to/your/convex-backend bun run test
   ```

## Troubleshooting

### Tests failing with "Failed to load products"
- Verify products are configured in Autumn dashboard
- Check `autumn.config.ts` matches your dashboard configuration
- Ensure Autumn API key is set: `AUTUMN_SECRET_KEY`

### Tests failing with authentication errors
- Verify `AUTH_E2E_TEST_SECRET` is set correctly
- Run `npx convex run tests:init` to create test user
- Check test user exists: `secret@secret.com`

### Entity tests are skipped
- This is expected! Entity tests require pre-existing entities
- To enable: Create entity in dashboard, set `TEST_ENTITY_ID` env var
