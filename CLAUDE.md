This project is a Svelte 5 reactive wrapper for Convex Autumn billing. It provides type-safe, reactive billing and subscription management for Svelte applications using Svelte 5 runes and best practices.

**Key Principles:**
- Use Svelte 5 runes ($state, $derived, $effect) for reactivity
- Provide both vanilla Svelte and SvelteKit (with SSR) implementations
- Use Context7 MCP to fetch Autumn docs (translate React concepts to Svelte 5)
- Use Svelte MCP to verify reactive implementation decisions
- Prefer $state over deprecated stores
- Focus on polished, production-ready code for public release


<claude-code-instructions>
<important_info>
Use Svelte 5's new syntax with TypeScript for reactivity, props, events, and content passing. Prioritize this over Svelte 4 syntax, always. Use `bun` as the package manager ("bun add", "bun add -d (for dev dependencies), "bunx").

**Key Svelte 5 Syntax Changes & Rune Usage:**

- **`$state()`:**
  - **When:** Use for declaring **mutable, independent pieces of reactive state**. This is the fundamental building block for values that change over time and should trigger UI updates or recalculations. Think of component-local variables, user inputs, fetched data containers, etc.
  - **How:** `let count = $state(0);`
  - **Note:** For complex objects/arrays where you only ever replace the entire value (not mutate internals), use `$state.raw()` for potential performance benefits by avoiding deep reactivity proxies.
- **`$derived()`:**
  - **When:** Use for values that are **computed based on other reactive sources** (`$state`, `$props`, other `$derived`). The computation should be **pure** (no side effects). Use whenever a value's existence or content _depends_ entirely on other reactive values. Examples: filtered lists, formatted strings, boolean flags derived from other state.
  - **How:** `let doubled = $derived(count * 2);` or for multi-step computations: `let complexValue = $derived.by(() => { /* ... */ return result; });`
  - **Note:** Always explicitly type derived arrays in TypeScript: `let items: Item[] = $derived(...)`.
- **`$effect()`:**
  - **When:** Use for running **side effects** in response to changes in reactive dependencies. This runs _after_ the DOM has been updated. Ideal for interacting with the DOM directly (e.g., canvas drawing), logging, integrating with third-party non-Svelte libraries, or triggering async operations based on state changes.
  - **Avoid:** **Do not use `$effect` to synchronize state** (e.g., setting one `$state` based on another) – use `$derived` for that. Avoid mutating state _inside_ an effect where possible to prevent complex flows and potential infinite loops. If needed, use `untrack()`.
  - **How:** `$effect(() => { console.log(count); });`
  - **`$effect.pre()`:** Use in rare cases when you need an effect to run _before_ the DOM updates (e.g., reading DOM measurements before a change).
- **`$props()`:**
  - **When:** Use inside the `<script>` block to declare the properties (props) a component accepts from its parent.
  - **How:** `let { name = 'World', requiredProp }: { name?: string, requiredProp: number } = $props();`
- **`$bindable()`:**
  - **When:** Use inside `$props()` to declare a prop that supports two-way binding with `bind:`.
  - **How:** `let { value = $bindable() } = $props<{ value: string }>();`
- **Events:** Use standard HTML event attributes (`onclick={handler}`, `onsubmit={handler}`) instead of `on:`.
- **Content/Slots:** Use `{#snippet name()}...{/snippet}` to define content snippets and `{@render name()}` to render them. Pass snippets as props: `let { header } = $props<{ header: Snippet }>();`. The default content passed between component tags is available via the implicit `children` snippet prop.
- **TypeScript:** Always use `<script lang="ts">`. Explicitly type variables, props, function arguments/returns, and derived arrays. Never use the any type, this will cause Eslint errors.
  Runes are a core Svelte 5 feature that works out of the box. They don't require any imports.

**component/page splitting**
Don't over complicate things. You can always come back and refine.
Make components to isolate logic and/or make something reusable. You can use Snippets to isolate logic without having to create a whole new component... But if you're using an each block, and there is logic that each item needs access to, that's a great place to start.
Other, not as important reasons, would be for clean access to layout items... The root +layouts generally should't have much in the way of HTML / styles, but have a lot of components.
On the server side, separate business logic from transport logic... So the actual load function holds a series of smaller functions that are very clear of what they do. A really simplified version of this:

export const load: PageServerLoad = async ({ locals }) => {
const authorized = check_authorization(locals)

if(!authorized) {
redirect(303, '/login');
}

const data = get_data(db)

if(!data){
error(500)
}

return {
...data
};
};
This makes it really easy to see what the load function is doing without having to dive into all of the business logic. Don't abstract those functions to different files until they need to be reused. But something like check_authorization() would probably be used a lot, and should be abstracted out. If you are asked to write Tests, they should live next to the file to save mental overhead.

**Assets**
For best performance, put most static assets used in components (like images) under `src` (e.g., `src/lib/assets`).

- **`src` Assets:** Vite processes these, adding content hashes to filenames (\( myImage-a89cfcb3.png \)). This enables aggressive browser caching, significantly reducing load times. Standard reference via `import`:

  ```svelte
  <script>
    import img from "$lib/images/img.avif"
  </script>

  <img src={img} alt="Image" />
  ```

- **`static` Assets:** Use _only_ for files needing a fixed root path (\( robots.txt, favicon.ico \)) that _shouldn't_ be processed by Vite. These don't get hashed and require slower browser validation checks.

Always add the `svelte-preprocess-import-assets` package (`bun add -d svelte-preprocess-import-assets`) to use simpler syntax that doesnt require the additional import: `<img src="$lib/images/img.avif" alt="Image" />`. Always ask the user to provide images in the .avif format if its a .png or .jpg image (for cdn images as well).
</claude-code-instructions>