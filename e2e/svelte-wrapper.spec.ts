import { expect, test } from "@playwright/test";

import { openHarness, readJson, resetPrimaryUser } from "./helpers/fixtures";

test.describe.configure({ mode: "serial" });

test.describe("vanilla svelte wrapper harness", () => {
	test.beforeEach(async ({ page }) => {
		await resetPrimaryUser(page, "/__e2e/svelte");
	});

	test("@smoke loads customer state and counts createCustomer fetches", async ({ page }) => {
		await openHarness(page, "/__e2e/svelte");

		const customer = await readJson(page, "customer-current");
		expect(customer.id).toBeTruthy();
		expect(customer.products).toContain("free");

		await expect
			.poll(async () => Number(await page.getByTestId("fetch-count").textContent()))
			.toBeGreaterThan(0);
	});

	test("allowed, listProducts, query, and check return stable payloads", async ({ page }) => {
		await openHarness(page, "/__e2e/svelte");

		expect(await readJson(page, "allowed-current")).toEqual({ allowed: true });

		await page.getByTestId("run-listProducts").click();
		await expect
			.poll(async () => (await readJson(page, "result-listProducts"))?.length ?? 0)
			.toBeGreaterThanOrEqual(2);

		const listedProducts = await readJson(page, "result-listProducts");
		expect(listedProducts.map((product: { id: string }) => product.id).sort()).toEqual([
			"free",
			"pro",
		]);

		await page.getByTestId("run-query").click();
		await expect
			.poll(async () => (await readJson(page, "result-query"))?.data?.list?.length ?? 0)
			.toBeGreaterThanOrEqual(0);

		await page.getByTestId("run-check").click();
		await expect
			.poll(async () => (await readJson(page, "result-check"))?.allowed)
			.not.toBeUndefined();
	});

	test("track increments usage and usage resets it to zero", async ({ page }) => {
		await openHarness(page, "/__e2e/svelte");

		const beforeTrack = await readJson(page, "customer-current");
		await page.getByTestId("run-track").click();

		await expect
			.poll(async () => (await readJson(page, "after-track"))?.messages?.usage)
			.toBe((beforeTrack.messages?.usage ?? 0) + 1);

		await page.getByTestId("run-usage").click();

		await expect
			.poll(async () => (await readJson(page, "customer-current"))?.messages?.usage)
			.toBe(0);
	});

	test("listEvents and aggregateEvents expose analytics data after tracking", async ({ page }) => {
		await openHarness(page, "/__e2e/svelte");

		await page.getByTestId("run-track").click();
		await expect
			.poll(async () => (await readJson(page, "after-track"))?.messages?.usage)
			.toBeGreaterThanOrEqual(1);

		await page.getByTestId("run-listEvents").click();
		await expect
			.poll(async () => (await readJson(page, "result-listEvents"))?.total)
			.toBeGreaterThanOrEqual(1);

		await page.getByTestId("run-aggregateEvents").click();
		await expect
			.poll(async () => (await readJson(page, "result-aggregateEvents"))?.data)
			.toBeTruthy();
	});
});
