import { expect, test } from "@playwright/test";

import { openHarness, readJson, resetPrimaryUser } from "./helpers/fixtures";

test.describe.configure({ mode: "serial" });

test.describe("live redirect flows", () => {
	test.beforeEach(async ({ page }) => {
		await resetPrimaryUser(page, "/__e2e/sveltekit");
	});

	test("checkout can navigate to a live external url", async ({ page }) => {
		await openHarness(page, "/__e2e/sveltekit?redirects=1");

		await page.getByTestId("run-checkout").click();

		await expect
			.poll(() => page.url())
			.toMatch(/^https?:\/\//);
		expect(page.url()).not.toContain("/__e2e/sveltekit");
	});

	test("setupPayment can navigate to a live external url", async ({ page }) => {
		await openHarness(page, "/__e2e/sveltekit?redirects=1");

		await page.getByTestId("run-setupPayment").click();

		await expect
			.poll(() => page.url())
			.toMatch(/^https?:\/\//);
		expect(page.url()).not.toContain("/__e2e/sveltekit");
	});

	test("billingPortal opens a popup when redirects are not captured", async ({ page }) => {
		await openHarness(page, "/__e2e/sveltekit");
		await page.getByTestId("run-attach").click();
		await expect
			.poll(async () => (await readJson(page, "customer-current"))?.products ?? [])
			.toContain("pro");

		await page.goto("/__e2e/sveltekit?redirects=1");
		const popupPromise = page.waitForEvent("popup");
		await page.getByTestId("run-billingPortal").click();
		const popup = await popupPromise;

		await expect
			.poll(() => popup.url())
			.toMatch(/^https?:\/\//);
	});
});
