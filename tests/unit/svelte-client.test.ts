import { beforeEach, describe, expect, test, vi } from "vitest";

import { flushPromises } from "../helpers/flush.js";
import { mockAutumnApi } from "../helpers/mock-api.js";
import {
	entity,
	eventListResult,
	fail,
	freeCustomer,
	ok,
	products,
	proCustomer,
	queryResult,
} from "../helpers/test-data.js";

const testState = vi.hoisted(() => ({
	context: new Map<unknown, unknown>(),
	convexClient: {
		action: vi.fn(),
	},
}));

vi.mock("svelte", () => ({
	getContext: (key: unknown) => testState.context.get(key),
	setContext: (key: unknown, value: unknown) => {
		testState.context.set(key, value);
		return value;
	},
}));

vi.mock("convex-svelte", () => ({
	useConvexClient: () => testState.convexClient,
}));

async function importSvelteModules() {
	const indexModule = await import("../../src/lib/svelte/index.svelte.ts");
	const clientModule = await import("../../src/lib/svelte/client.svelte.ts");
	const typesModule = await import("../../src/lib/svelte/types.ts");

	return { ...indexModule, ...clientModule, ...typesModule };
}

describe("svelte client wrapper", () => {
	beforeEach(() => {
		testState.context.clear();
		testState.convexClient.action.mockReset();
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	test("setupAutumn stores context and useCustomer reads it reactively", async () => {
		testState.convexClient.action.mockResolvedValue(ok(freeCustomer));

		const { isAutumnSetup, setupAutumn, useCustomer } =
			await importSvelteModules();

		expect(isAutumnSetup()).toBe(false);

		const autumn = setupAutumn({ convexApi: mockAutumnApi });
		expect(autumn.isLoading).toBe(true);

		await flushPromises();

		expect(isAutumnSetup()).toBe(true);
		expect(useCustomer().customer?.id).toBe(freeCustomer.id);
		expect(testState.convexClient.action).toHaveBeenCalledWith(
			mockAutumnApi.createCustomer,
			{
				expand: {},
				errorOnNotFound: false,
			},
		);
	});

	test("useCustomer throws when setupAutumn was skipped", async () => {
		const { useCustomer } = await importSvelteModules();

		expect(() => useCustomer()).toThrow(
			"No Autumn client found in context. Did you forget to call setupAutumn()?",
		);
	});

	test("initial createCustomer fetch populates customer state and allowed()", async () => {
		testState.convexClient.action.mockResolvedValue(ok(freeCustomer));

		const { setupAutumn } = await importSvelteModules();
		const autumn = setupAutumn({ convexApi: mockAutumnApi });

		await flushPromises();

		expect(autumn.customer?.id).toBe(freeCustomer.id);
		expect(autumn.isLoading).toBe(false);
		expect(autumn.error).toBeNull();
		expect(autumn.allowed({ featureId: "messages" })).toEqual({ allowed: true });
		expect(autumn.allowed({ featureId: "missing" })).toEqual({
			allowed: false,
			reason: "Feature not found",
		});
		expect(
			autumn.allowed({ featureId: "messages", requiredBalance: 99 }),
		).toEqual({
			allowed: false,
			reason: "Insufficient balance: 9 < 99",
		});
	});

	test("allowed() rejects access when customer data is unavailable", async () => {
		testState.convexClient.action.mockResolvedValue(ok(null));

		const { setupAutumn } = await importSvelteModules();
		const autumn = setupAutumn({ convexApi: mockAutumnApi });

		await flushPromises();

		expect(autumn.allowed({ featureId: "messages" })).toEqual({
			allowed: false,
			reason: "No customer data",
		});
	});

	test.each([
		["check", { featureId: "messages" }, ok({ allowed: true, balance: 8 })],
		["checkout", { productId: "pro" }, ok({ url: "https://checkout.test" })],
		["track", { featureId: "messages", value: 1 }, ok({ success: true, balance: 8 })],
		["attach", { productId: "pro" }, ok({} as void)],
		["cancel", { productId: "pro" }, ok({} as void)],
		[
			"createEntity",
			{ id: entity.id, name: entity.name, featureId: "messages" },
			ok(entity),
		],
		["createReferralCode", { programId: "default" }, ok({ code: "REF", program_id: "default" })],
		["redeemReferralCode", { code: "REF" }, ok({ success: true })],
	])("%s refetches customer by default", async (method, params, response) => {
		testState.convexClient.action
			.mockResolvedValueOnce(ok(freeCustomer))
			.mockResolvedValueOnce(response)
			.mockResolvedValueOnce(ok(proCustomer));

		const { setupAutumn } = await importSvelteModules();
		const autumn = setupAutumn({ convexApi: mockAutumnApi });

		await flushPromises();

		await (autumn as Record<string, (...args: unknown[]) => Promise<unknown>>)[method](
			params,
		);

		expect(testState.convexClient.action).toHaveBeenNthCalledWith(
			3,
			mockAutumnApi.createCustomer,
			{
				expand: {},
				errorOnNotFound: false,
			},
		);
	});

	test.each([
		["check", { featureId: "messages" }, ok({ allowed: true, balance: 8 })],
		["checkout", { productId: "pro" }, ok({ url: "https://checkout.test" })],
		["track", { featureId: "messages", value: 1 }, ok({ success: true, balance: 8 })],
		["attach", { productId: "pro" }, ok({} as void)],
		["cancel", { productId: "pro" }, ok({} as void)],
		[
			"createEntity",
			{ id: entity.id, name: entity.name, featureId: "messages" },
			ok(entity),
		],
		["createReferralCode", { programId: "default" }, ok({ code: "REF", program_id: "default" })],
		["redeemReferralCode", { code: "REF" }, ok({ success: true })],
	])("%s skips customer refetch when refetch is false", async (method, params, response) => {
		testState.convexClient.action
			.mockResolvedValueOnce(ok(freeCustomer))
			.mockResolvedValueOnce(response);

		const { setupAutumn } = await importSvelteModules();
		const autumn = setupAutumn({ convexApi: mockAutumnApi });

		await flushPromises();

		await (autumn as Record<string, (...args: unknown[]) => Promise<unknown>>)[method](
			params,
			{ refetch: false },
		);

		expect(testState.convexClient.action).toHaveBeenCalledTimes(2);
	});

	test("listProducts, query, getEntity, usage, listEvents, and aggregateEvents do not refetch customer", async () => {
		testState.convexClient.action
			.mockResolvedValueOnce(ok(freeCustomer))
			.mockResolvedValueOnce(ok({ list: products }))
			.mockResolvedValueOnce(ok(queryResult))
			.mockResolvedValueOnce(ok(entity))
			.mockResolvedValueOnce(ok({ success: true }))
			.mockResolvedValueOnce(ok(eventListResult))
			.mockResolvedValueOnce(ok(queryResult));

		const { setupAutumn } = await importSvelteModules();
		const autumn = setupAutumn({ convexApi: mockAutumnApi });

		await flushPromises();

		await expect(autumn.listProducts()).resolves.toEqual(products);
		await expect(
			autumn.query({ featureId: "messages", range: "30d" }),
		).resolves.toEqual(queryResult);
		await expect(autumn.getEntity({ entityId: entity.id })).resolves.toEqual(entity);
		await expect(
			autumn.usage({ featureId: "messages", value: 0 }),
		).resolves.toEqual({ success: true });
		await expect(
			autumn.listEvents({ featureId: "messages", limit: 10 }),
		).resolves.toEqual(eventListResult);
		await expect(
			autumn.aggregateEvents({ featureId: "messages", range: "30d" }),
		).resolves.toEqual(queryResult);

		expect(testState.convexClient.action).toHaveBeenCalledTimes(7);
	});

	test("checkout invokes dialog callback when a url is returned", async () => {
		const dialog = vi.fn();
		vi.stubGlobal("window", {
			open: vi.fn(),
			location: { href: "https://app.test/original" },
		});

		testState.convexClient.action
			.mockResolvedValueOnce(ok(freeCustomer))
			.mockResolvedValueOnce(ok({ url: "https://checkout.test" }));

		const { setupAutumn } = await importSvelteModules();
		const autumn = setupAutumn({ convexApi: mockAutumnApi });

		await flushPromises();
		await autumn.checkout(
			{ productId: "pro", dialog },
			{ refetch: false },
		);

		expect(dialog).toHaveBeenCalledWith("https://checkout.test");
	});

	test("openBillingPortal uses window.open in the browser", async () => {
		const open = vi.fn();
		vi.stubGlobal("window", {
			open,
			location: { href: "https://app.test/original" },
		});

		testState.convexClient.action
			.mockResolvedValueOnce(ok(freeCustomer))
			.mockResolvedValueOnce(ok({ url: "https://billing.test" }));

		const { setupAutumn } = await importSvelteModules();
		const autumn = setupAutumn({ convexApi: mockAutumnApi });

		await flushPromises();
		await autumn.openBillingPortal();

		expect(open).toHaveBeenCalledWith("https://billing.test", "_blank");
	});

	test("setupPayment updates window.location.href", async () => {
		const location = { href: "https://app.test/original" };
		vi.stubGlobal("window", {
			open: vi.fn(),
			location,
		});

		testState.convexClient.action
			.mockResolvedValueOnce(ok(freeCustomer))
			.mockResolvedValueOnce(ok({ url: "https://billing.test/setup" }))
			.mockResolvedValueOnce(ok(proCustomer));

		const { setupAutumn } = await importSvelteModules();
		const autumn = setupAutumn({ convexApi: mockAutumnApi });

		await flushPromises();
		await autumn.setupPayment();

		expect(location.href).toBe("https://billing.test/setup");
	});

	test("failed initial fetch stores an error and null customer", async () => {
		testState.convexClient.action.mockResolvedValue(fail("No customer"));

		const { setupAutumn } = await importSvelteModules();
		const autumn = setupAutumn({ convexApi: mockAutumnApi });

		await flushPromises();

		expect(autumn.customer).toBeNull();
		expect(autumn.error?.message).toBe("No customer");
	});

	test("unwrapAutumnResponse throws AutumnError for wrapped failures and empty payloads", async () => {
		const { AutumnError, unwrapAutumnResponse } = await importSvelteModules();

		expect(() => unwrapAutumnResponse(fail("Broken", "BROKEN"))).toThrow(AutumnError);
		expect(() =>
			unwrapAutumnResponse({
				data: null,
				error: null,
			}),
		).toThrowError("No data in response");
	});
});
