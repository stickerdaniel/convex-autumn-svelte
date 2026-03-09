import { beforeEach, describe, expect, test, vi } from "vitest";

import { flushPromises } from "../helpers/flush.js";
import { mockAutumnApi } from "../helpers/mock-api.js";
import { createReactiveServerState } from "../helpers/reactive-state.svelte.js";
import {
	entity,
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

async function importSvelteKitModules() {
	const indexModule = await import("../../src/lib/sveltekit/index.ts");
	const clientModule = await import("../../src/lib/sveltekit/client.svelte.ts");

	return { ...indexModule, ...clientModule };
}

describe("sveltekit client wrapper", () => {
	beforeEach(() => {
		testState.context.clear();
		testState.convexClient.action.mockReset();
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	test("setupAutumn hydrates customer from getServerState", async () => {
		const serverState = createReactiveServerState(freeCustomer);
		const invalidate = vi.fn().mockResolvedValue(undefined);
		const { isAutumnSetup, setupAutumn, useCustomer } =
			await importSvelteKitModules();

		expect(isAutumnSetup()).toBe(false);

		const autumn = setupAutumn({
			convexApi: mockAutumnApi,
			getServerState: serverState.getServerState,
			invalidate,
		});

		expect(isAutumnSetup()).toBe(true);
		expect(autumn.customer?.id).toBe(freeCustomer.id);
		expect(useCustomer().customer?.id).toBe(freeCustomer.id);
		expect(invalidate).not.toHaveBeenCalled();
	});

	test.each([
		["check", { featureId: "messages" }, ok({ allowed: true })],
		["checkout", { productId: "pro" }, ok({ url: "https://checkout.test" })],
		["track", { featureId: "messages", value: 1 }, ok({ success: true, balance: 8 })],
		["attach", { productId: "pro" }, ok({} as void)],
		["cancel", { productId: "pro" }, ok({} as void)],
		[
			"createEntity",
			{ id: entity.id, name: entity.name, featureId: "messages" },
			ok(entity),
		],
		["setupPayment", {}, ok({ url: "https://billing.test/setup" })],
		["createReferralCode", { programId: "default" }, ok({ code: "REF", program_id: "default" })],
		["redeemReferralCode", { code: "REF" }, ok({ success: true })],
	])("%s invalidates once by default", async (method, params, response) => {
		const invalidate = vi.fn().mockResolvedValue(undefined);
		testState.convexClient.action.mockResolvedValue(response);

		const { setupAutumn } = await importSvelteKitModules();
		const autumn = setupAutumn({
			convexApi: mockAutumnApi,
			getServerState: () => ({ customer: freeCustomer, _timeFetched: Date.now() }),
			invalidate,
		});

		await (autumn as Record<string, (...args: unknown[]) => Promise<unknown>>)[method](
			params,
		);

		expect(invalidate).toHaveBeenCalledTimes(1);
		expect(invalidate).toHaveBeenCalledWith("autumn:customer");
	});

	test.each([
		["check", { featureId: "messages" }, ok({ allowed: true })],
		["checkout", { productId: "pro" }, ok({ url: "https://checkout.test" })],
		["track", { featureId: "messages", value: 1 }, ok({ success: true, balance: 8 })],
		["attach", { productId: "pro" }, ok({} as void)],
		["cancel", { productId: "pro" }, ok({} as void)],
		[
			"createEntity",
			{ id: entity.id, name: entity.name, featureId: "messages" },
			ok(entity),
		],
		["setupPayment", {}, ok({ url: "https://billing.test/setup" })],
		["createReferralCode", { programId: "default" }, ok({ code: "REF", program_id: "default" })],
		["redeemReferralCode", { code: "REF" }, ok({ success: true })],
	])("%s skips invalidation when refetch is false", async (method, params, response) => {
		const invalidate = vi.fn().mockResolvedValue(undefined);
		testState.convexClient.action.mockResolvedValue(response);

		const { setupAutumn } = await importSvelteKitModules();
		const autumn = setupAutumn({
			convexApi: mockAutumnApi,
			getServerState: () => ({ customer: freeCustomer, _timeFetched: Date.now() }),
			invalidate,
		});

		await (autumn as Record<string, (...args: unknown[]) => Promise<unknown>>)[method](
			params,
			{ refetch: false },
		);

		expect(invalidate).not.toHaveBeenCalled();
	});

	test("listProducts, query, getEntity, usage, and billingPortal do not invalidate", async () => {
		const invalidate = vi.fn().mockResolvedValue(undefined);
		const open = vi.fn();
		vi.stubGlobal("window", {
			open,
			location: { href: "https://app.test/original" },
		});

		testState.convexClient.action
			.mockResolvedValueOnce(ok({ list: products }))
			.mockResolvedValueOnce(ok(queryResult))
			.mockResolvedValueOnce(ok(entity))
			.mockResolvedValueOnce(ok({ success: true }))
			.mockResolvedValueOnce(ok({ url: "https://billing.test" }));

		const { setupAutumn } = await importSvelteKitModules();
		const autumn = setupAutumn({
			convexApi: mockAutumnApi,
			getServerState: () => ({ customer: freeCustomer, _timeFetched: Date.now() }),
			invalidate,
		});

		await expect(autumn.listProducts()).resolves.toEqual(products);
		await expect(autumn.query({ featureId: "messages" })).resolves.toEqual(
			queryResult,
		);
		await expect(autumn.getEntity({ entityId: entity.id })).resolves.toEqual(entity);
		await expect(
			autumn.usage({ featureId: "messages", value: 0 }),
		).resolves.toEqual({ success: true });
		await autumn.openBillingPortal();

		expect(invalidate).not.toHaveBeenCalled();
		expect(open).toHaveBeenCalledWith("https://billing.test", "_blank");
	});

	test("setupPayment updates window.location.href in the browser", async () => {
		const location = { href: "https://app.test/original" };
		vi.stubGlobal("window", {
			open: vi.fn(),
			location,
		});

		testState.convexClient.action.mockResolvedValue(ok({ url: "https://billing.test/setup" }));

		const { setupAutumn } = await importSvelteKitModules();
		const autumn = setupAutumn({
			convexApi: mockAutumnApi,
			getServerState: () => ({ customer: freeCustomer, _timeFetched: Date.now() }),
			invalidate: vi.fn().mockResolvedValue(undefined),
		});

		await autumn.setupPayment({}, { refetch: false });

		expect(location.href).toBe("https://billing.test/setup");
	});

	test("checkout invokes dialog callback when provided", async () => {
		const dialog = vi.fn();
		vi.stubGlobal("window", {
			open: vi.fn(),
			location: { href: "https://app.test/original" },
		});

		testState.convexClient.action.mockResolvedValue(ok({ url: "https://checkout.test" }));

		const { setupAutumn } = await importSvelteKitModules();
		const autumn = setupAutumn({
			convexApi: mockAutumnApi,
			getServerState: () => ({ customer: freeCustomer, _timeFetched: Date.now() }),
			invalidate: vi.fn().mockResolvedValue(undefined),
		});

		await autumn.checkout(
			{ productId: "pro", dialog },
			{ refetch: false },
		);

		expect(dialog).toHaveBeenCalledWith("https://checkout.test");
	});

	test("refetch triggers exactly one invalidate", async () => {
		const invalidate = vi.fn().mockResolvedValue(undefined);
		const { setupAutumn } = await importSvelteKitModules();
		const autumn = setupAutumn({
			convexApi: mockAutumnApi,
			getServerState: () => ({ customer: freeCustomer, _timeFetched: Date.now() }),
			invalidate,
		});

		await autumn.refetch();

		expect(invalidate).toHaveBeenCalledTimes(1);
		expect(invalidate).toHaveBeenCalledWith("autumn:customer");
	});
});
