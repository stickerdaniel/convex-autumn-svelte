# Convex Autumn Svelte

**Reactive Svelte 5 bindings for [Autumn billing](https://useautumn.com) with [Convex](https://convex.dev)** - Make subscription billing and feature access control effortless in your Svelte applications.

## Features

- **Reactive Customer Data** - Automatic UI updates when billing data changes
- **Access all Autumn Operations** - Check and track usage with simple APIs, start Stripe checkout flows, create entities, and more.
- **SSR Support** - Server-side rendering with SvelteKit
- **Type Safe** - Complete TypeScript support
- **Auth Agnostic** - Works with any authentication solution (Convex Auth, BetterAuth, custom, etc.)

## Getting Started

### [Vanilla Svelte Guide](./src/lib/svelte/README.md)
For client-side only applications. Includes manual state management with loading and error states.

### [SvelteKit Guide](./src/lib/sveltekit/README.md)
For full-stack applications with SSR. Pre-loads data on the server for instant UI with no loading states.


## Resources

- **[Autumn Chat](https://autumn-chat.vercel.app/)** - AI assistant to help you build the right `autumn.config.ts` from your requirements
- [Autumn Documentation](https://docs.useautumn.com)
- [Convex Documentation](https://docs.convex.dev)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte/$state)
- [SvelteKit Documentation](https://svelte.dev/docs/kit)


## Develop & Contribute

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
bun test
```

## License

MIT
