# Convex Autumn Svelte

<p align="left">
  <a href="https://github.com/stickerdaniel/convex-autumn-svelte/actions/workflows/ci.yml" target="_blank"><img src="https://github.com/stickerdaniel/convex-autumn-svelte/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI Status"></a>
  <a href="https://github.com/stickerdaniel/convex-autumn-svelte/blob/main/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-MIT-brightgreen?labelColor=32383f" alt="License"></a>
</p>

**Reactive Svelte 5 bindings for [Autumn billing](https://useautumn.com) with [Convex](https://convex.dev)** - Make subscription billing and feature access control effortless in your Svelte applications.

## Features

- **Reactive Customer Data** - Automatic UI updates when billing data changes
- **Access all Autumn Operations** - Check and track usage with simple APIs, start Stripe checkout flows, create entities, and more.
- **SSR Support** - Server-side rendering with SvelteKit 2 and 3
- **Type Safe** - Complete TypeScript support
- **Auth Agnostic** - Works with any authentication solution (Convex Auth, BetterAuth, custom, etc.)

## Getting Started

### [Vanilla Svelte Guide](./src/lib/svelte/README.md)

For client-side only applications. Includes manual state management with loading and error states.

### [SvelteKit Guide](./src/lib/sveltekit/README.md)

For full-stack applications with SSR. Pre-loads data on the server for instant UI with no loading states.

Version 0.5 supports SvelteKit `^2.21.0 || ^3.0.0` and Svelte 5. Existing billing APIs
and targeted customer refresh remain unchanged. The guide includes
[SvelteKit 3 configuration and environment setup](./src/lib/sveltekit/README.md#sveltekit-3).

## Resources

- **[Autumn Chat](https://autumn-chat.vercel.app/)** - AI assistant to help you build the right `autumn.config.ts` from your requirements
- [Autumn Documentation](https://docs.useautumn.com)
- [Convex Documentation](https://docs.convex.dev)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte/$state)
- [SvelteKit Documentation](https://svelte.dev/docs/kit)

## Develop & Contribute

The demo and development tools use SvelteKit 3. Install Node **22.17 or newer** and Bun.
SvelteKit 3 also requires TypeScript 6, Svelte 5.57.1+, and Vite 8.0.12+;
the repository pins compatible versions. Set `PUBLIC_CONVEX_URL` in `.env.local`
before building the demo.

```bash
# Install dependencies
bun install

# Run dev server (frontend + backend)
bun dev

# Build package
bun run package

# Type check
bun run check

# Run tests
bun run test

# Verify the installed package in SvelteKit 2 and 3 consumers
bun run test:compat
```

See [AGENTS.md](./AGENTS.md) for project conventions and the Convex
dashboard env vars CI relies on.

To release, bump the stable version in `package.json` in a reviewed PR. After it
merges to `main`, CI checks the package, verifies the installed tarball in both Kit
versions, and runs live billing tests before publishing that same tarball to npm.
Existing versions are skipped. Run CI manually on `main` to retry a release.

Publishing uses npm trusted publishing for `stickerdaniel/convex-autumn-svelte`,
workflow `ci.yml`, and GitHub environment `npm`. No npm token is stored in GitHub.

## License

MIT
