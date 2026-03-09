import { expect, test } from "@playwright/test";

import { signInAsPrimary, signInAsSecondary, signOut } from "./helpers/auth";
import {
	openHarness,
	readJson,
	resetPrimaryUser,
	resetSecondaryUser,
} from "./helpers/fixtures";

test.describe.configure({ mode: "serial" });

test.describe("sveltekit wrapper harness", () => {
	test.beforeEach(async ({ page }) => {
		await resetPrimaryUser(page, "/__e2e/sveltekit");
	});

	test("@smoke hydrates SSR customer state without initial invalidation", async ({ page }) => {
		await openHarness(page, "/__e2e/sveltekit");

		expect(await readJson(page, "customer-current")).toMatchObject({
			products: ["free"],
		});
		expect(Number(await page.getByTestId("invalidate-count").textContent())).toBe(0);
	});

	test("attach and cancel toggle the product state and invalidate", async ({ page }) => {
		await openHarness(page, "/__e2e/sveltekit");

		await page.getByTestId("run-attach").click();
		await expect
			.poll(async () => (await readJson(page, "customer-current"))?.products ?? [])
			.toContain("pro");

		const invalidationsAfterAttach = Number(
			await page.getByTestId("invalidate-count").textContent(),
		);
		expect(invalidationsAfterAttach).toBeGreaterThan(0);

		await page.getByTestId("run-cancel").click();
		await expect
			.poll(async () => (await readJson(page, "customer-current"))?.products ?? [])
			.not.toContain("pro");
	});

	test("createEntity and getEntity round-trip an e2e entity", async ({ page }) => {
		await openHarness(page, "/__e2e/sveltekit");

		await page.getByTestId("run-createEntity").click();
		await expect
			.poll(async () => {
				const value = await readJson(page, "created-entity-id");
				return typeof value === "string" && value.startsWith("e2e-");
			})
			.toBe(true);

		await page.getByTestId("run-getEntity").click();

		const entity = await readJson(page, "result-getEntity");
		expect(entity.id).toBeTruthy();
		expect(entity.id).toContain("e2e-");
	});

	test("referral code flows across primary and secondary users", async ({ page }) => {
		await openHarness(page, "/__e2e/sveltekit");

		await page.getByTestId("run-createReferralCode").click();
		await expect
			.poll(async () => {
				const value = await readJson(page, "created-referral-code");
				return typeof value === "string" && value.length > 0;
			})
			.toBe(true);
		const referralCode = (await readJson(page, "created-referral-code")) as string;

		await resetSecondaryUser(page, "/__e2e/sveltekit");
		await page.getByTestId("redeem-code-input").fill(referralCode);
		await page.getByTestId("run-redeemReferralCode").click();

		await expect
			.poll(async () => (await readJson(page, "result-redeemReferralCode"))?.success)
			.toBe(true);

		await signOut(page);
		await signInAsPrimary(page);
	});

	test("captures checkout and billing portal urls without relying on page copy", async ({
		page,
	}) => {
		await openHarness(page, "/__e2e/sveltekit");

		await page.getByTestId("run-checkout").click();
		await expect
			.poll(async () => {
				const value = await readJson(page, "captured-checkout-url");
				return typeof value === "string" && value.startsWith("http");
			})
			.toBe(true);

		await page.getByTestId("run-attach").click();
		await expect
			.poll(async () => (await readJson(page, "customer-current"))?.products ?? [])
			.toContain("pro");

		await page.getByTestId("run-billingPortal").click();
		await expect
			.poll(async () => {
				const value = await readJson(page, "captured-billing-portal-url");
				return typeof value === "string" && value.startsWith("http");
			})
			.toBe(true);
	});
});
