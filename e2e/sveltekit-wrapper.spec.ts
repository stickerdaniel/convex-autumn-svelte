import { expect, test } from "@playwright/test";

import { signInAsPrimary, signOut } from "./helpers/auth";
import { attachPro } from "./helpers/billing";
import {
	openHarness,
	readJson,
	resetPrimaryUser,
	resetSecondaryUser,
	waitForOperation,
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
		await attachPro(page);

		await page.getByTestId("run-cancel").click();
		await waitForOperation(page, "cancel");
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
		const entity = await waitForOperation(page, "getEntity");
		expect(entity.id).toBeTruthy();
		expect(entity.id).toContain("e2e-");
	});

	test("referral code flows across primary and secondary users", async ({ page }) => {
		await openHarness(page, "/__e2e/sveltekit");
		const referrerId = (await readJson(page, "customer-current")).id;

		await page.getByTestId("run-createReferralCode").click();
		await waitForOperation(page, "createReferralCode");
		await expect
			.poll(async () => {
				const value = await readJson(page, "created-referral-code");
				return typeof value === "string" && value.length > 0;
			})
			.toBe(true);
		const referralCode = (await readJson(page, "created-referral-code")) as string;

		await resetSecondaryUser(page, "/__e2e/sveltekit");
		const redeemerId = (await readJson(page, "customer-current")).id;
		await page.getByTestId("redeem-code-input").fill(referralCode);
		await page.getByTestId("run-redeemReferralCode").click();
		const redemption = await waitForOperation(page, "redeemReferralCode");
		expect(redemption).toMatchObject({
			id: expect.any(String),
			customer_id: redeemerId,
			reward_id: expect.any(String),
			referrer: { id: referrerId },
		});

		await resetSecondaryUser(page, "/__e2e/sveltekit");
		await page.goto("/account");
		await page.getByPlaceholder("Enter referral code", { exact: true }).fill(referralCode);
		await page.getByRole("button", { name: "Redeem", exact: true }).click();
		await expect(page.getByText("Referral code redeemed successfully!", { exact: true })).toBeVisible();

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

		await attachPro(page);

		await page.getByTestId("run-billingPortal").click();
		await expect
			.poll(async () => {
				const value = await readJson(page, "captured-billing-portal-url");
				return typeof value === "string" && value.startsWith("http");
			})
			.toBe(true);
	});

	test("listEvents and aggregateEvents do not trigger extra invalidation", async ({
		page,
	}) => {
		await openHarness(page, "/__e2e/sveltekit");

		const before = Number(await page.getByTestId("invalidate-count").textContent());

		await page.getByTestId("run-listEvents").click();
		await expect
			.poll(async () => (await readJson(page, "result-listEvents"))?.list)
			.toBeTruthy();

		await page.getByTestId("run-aggregateEvents").click();
		const aggregate = await waitForOperation(page, "aggregateEvents");
		expect(Array.isArray(aggregate.list)).toBe(true);

		const after = Number(await page.getByTestId("invalidate-count").textContent());
		expect(after).toBe(before);
	});
});
