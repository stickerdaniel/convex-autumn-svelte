import { describe, expect, test, vi } from "vitest";

import { createAutumnHandlers } from "../../src/lib/sveltekit/server/index.js";
import { mockAutumnApi } from "../helpers/mock-api.js";
import { entity, fail, freeCustomer, ok } from "../helpers/test-data.js";

describe("sveltekit server helpers", () => {
	test("getCustomer returns null for unauthenticated requests", async () => {
		const client = {
			action: vi.fn().mockRejectedValue(new Error("No customer identifier found")),
		};
		const handlers = createAutumnHandlers({
			convexApi: mockAutumnApi,
			createClient: () => client as never,
		});

		await expect(handlers.getCustomer({} as never)).resolves.toBeNull();
	});

	test("getCustomer unwraps successful responses", async () => {
		const client = {
			action: vi.fn().mockResolvedValue(ok(freeCustomer)),
		};
		const handlers = createAutumnHandlers({
			convexApi: mockAutumnApi,
			createClient: () => client as never,
		});

		await expect(handlers.getCustomer({} as never)).resolves.toEqual(freeCustomer);
		expect(client.action).toHaveBeenCalledWith(mockAutumnApi.createCustomer, {});
	});

	test("getEntity returns null on wrapped failures", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const client = {
			action: vi.fn().mockResolvedValue(fail("Missing entity", "NOT_FOUND")),
		};
		const handlers = createAutumnHandlers({
			convexApi: mockAutumnApi,
			createClient: () => client as never,
		});

		await expect(handlers.getEntity({} as never, entity.id)).resolves.toBeNull();
		consoleError.mockRestore();
	});

	test("getEntity returns the requested entity on success", async () => {
		const client = {
			action: vi.fn().mockResolvedValue(ok(entity)),
		};
		const handlers = createAutumnHandlers({
			convexApi: mockAutumnApi,
			createClient: () => client as never,
		});

		await expect(handlers.getEntity({} as never, entity.id)).resolves.toEqual(entity);
		expect(client.action).toHaveBeenCalledWith(mockAutumnApi.getEntity, {
			entityId: entity.id,
		});
	});

	test("getConvexClient passes through the authenticated client factory", async () => {
		const client = {
			action: vi.fn(),
			query: vi.fn(),
		};
		const handlers = createAutumnHandlers({
			convexApi: mockAutumnApi,
			createClient: () => client as never,
		});

		await expect(handlers.getConvexClient({} as never)).resolves.toBe(client);
	});
});
