# Project setup & maintainer notes

Notes for maintainers (and coding agents) working on this repo. Library
consumers don't need any of this — see the [README](./README.md) and the
[Vanilla Svelte](./src/lib/svelte/README.md) / [SvelteKit](./src/lib/sveltekit/README.md)
guides for usage.

## Convex deployments

The repo has two Convex deployments under the
[`daniel-sticker-name/convex-autumn-svelte`](https://dashboard.convex.dev/t/daniel-sticker-name/convex-autumn-svelte)
project:

- **Dev** (`dev:calm-seal-185`) — personal dev deployment, used by `bun dev`
  via the values in `.env.local`.
- **Preview** — ephemeral deployments created per PR by CI via
  `convex deploy --preview-create pr-<number>`. Auto-cleaned by Convex
  after 5 days. Uses the **preview deploy key** stored in the GitHub
  secret `CONVEX_DEPLOY_KEY`.

## Required Convex environment variables

Set these in the Convex dashboard for the **Preview** scope so every
new preview deployment inherits them:

[**Convex → Project Settings → Default Environment Variables**](https://dashboard.convex.dev/t/daniel-sticker-name/convex-autumn-svelte/settings#env-vars)

| Variable | Value | Why |
|---|---|---|
| `ENABLE_E2E_HARNESS` | `1` | `assertHarnessEnabled` in `src/lib/convex/e2e.ts` rejects calls otherwise. Needed for the Playwright reset action. |
| `AUTUMN_SECRET_KEY` | Autumn test key (`am_sk_test_…`) | `src/lib/convex/autumn.ts` throws on module load if missing. |
| `AUTH_E2E_TEST_SECRET_PRIMARY` | `test-secret` | JWT secret the Playwright harness signs primary-user tokens with. Must match what `e2e/helpers/auth.ts` uses. |
| `AUTH_E2E_TEST_SECRET_SECONDARY` | `secondary-secret` | Same, for the secondary test user. |
| `JWT_PRIVATE_KEY`, `JWKS` | Copy from the dev deployment | Convex Auth uses these to sign/verify session tokens. |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | OAuth app creds | Only if E2E exercises GitHub sign-in. |
| `AUTH_RESEND_KEY` | Resend API key | Only if E2E exercises email flows. |
| `SITE_URL` | optional | Used by Convex Auth for redirect URLs. |

The same variables exist on the dev deployment for local work — kept in
sync manually. `bunx convex env list` shows the current values.

## GitHub repository secrets

Set under **Settings → Secrets and variables → Actions**:

| Secret | Where it's used |
|---|---|
| `CONVEX_DEPLOY_KEY` | Preview deploy key. `live-autumn.yml` uses it for `convex deploy --preview-create`. |
| `AUTH_E2E_TEST_SECRET_PRIMARY` | Read by Playwright (`e2e/helpers/auth.ts`) on the runner — values must match what's in the Convex Preview env. |
| `AUTH_E2E_TEST_SECRET_SECONDARY` | Same. |
| `CLAUDE_CODE_OAUTH_TOKEN` | Used by `claude.yml`. |

`AUTUMN_SECRET_KEY` is intentionally **not** a GitHub secret — only the
Convex backend reads it, and the dashboard's Default Environment
Variables propagate it to every preview.

## CI workflows

- **`.github/workflows/ci.yml`** — runs on every push/PR. Typecheck,
  contract tests, unit tests. Cheap, fast, no Convex deployment.
- **`.github/workflows/live-autumn.yml`** — runs the full Playwright
  suite against an ephemeral Convex preview. Triggers:
  - PRs that touch source, configs, or the workflow itself
  - Nightly cron (4:00 UTC) → preview name `nightly`
  - `workflow_dispatch` → preview name `manual-<run_id>`
  - Skipped on forked PRs and bot PRs (no secret access).
  - `concurrency` cancels stale runs on the same PR so a second push
    doesn't recreate the preview while Playwright still runs against
    the first one (Convex deletes-and-recreates same-name previews).
- **`.github/workflows/claude.yml`** — Claude Code review automation.

## Local development

```bash
bun install
bun dev              # frontend + convex dev concurrently
bun run package      # build the library
bun run check        # svelte-check typecheck
bun test             # contract + unit tests
bun run test:e2e     # Playwright suite (needs PUBLIC_CONVEX_URL set, e.g. dev deployment)
```

`.env.local` provides `PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, and the
local `AUTH_E2E_TEST_SECRET` for dev work. The CI runs do not use this
file — the typecheck job sets a placeholder `PUBLIC_CONVEX_URL` and the
live-e2e job derives the URL from `convex deploy --cmd`.
