import { beforeEach, describe, expect, test, vi } from "vitest";

describe("useAutumnOperation", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	test("tracks loading, result, and merged options on success", async () => {
		const { useAutumnOperation } = await import(
			"../../src/lib/sveltekit/client.svelte.ts"
		);
		const operation = vi
			.fn()
			.mockImplementation(async (_params, options) => options);
		const wrapped = useAutumnOperation(operation, { refetch: false });

		const pending = wrapped.execute(
			{ productId: "pro" },
			{ refetch: true },
		);

		expect(wrapped.isLoading).toBe(true);

		const result = await pending;

		expect(operation).toHaveBeenCalledWith(
			{ productId: "pro" },
			{ refetch: true },
		);
		expect(result).toEqual({ refetch: true });
		expect(wrapped.result).toEqual({ refetch: true });
		expect(wrapped.error).toBeNull();
		expect(wrapped.isLoading).toBe(false);
	});

	test("captures thrown errors and resets result", async () => {
		const { useAutumnOperation } = await import(
			"../../src/lib/sveltekit/client.svelte.ts"
		);
		const operation = vi.fn().mockRejectedValue(new Error("Boom"));
		const wrapped = useAutumnOperation(operation);

		await expect(wrapped.execute({ featureId: "messages" })).resolves.toBeNull();
		expect(wrapped.error?.message).toBe("Boom");
		expect(wrapped.result).toBeNull();
		expect(wrapped.isLoading).toBe(false);
	});

	test("reset clears local state", async () => {
		const { useAutumnOperation } = await import(
			"../../src/lib/sveltekit/client.svelte.ts"
		);
		const operation = vi.fn().mockResolvedValue({ ok: true });
		const wrapped = useAutumnOperation(operation);

		await wrapped.execute({ featureId: "messages" });
		expect(wrapped.result).toEqual({ ok: true });

		wrapped.reset();

		expect(wrapped.result).toBeNull();
		expect(wrapped.error).toBeNull();
		expect(wrapped.isLoading).toBe(false);
	});
});
