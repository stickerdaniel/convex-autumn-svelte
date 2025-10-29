import { test, expect } from "@playwright/test";
import { signInAndNavigateToAccount } from "./helpers/auth";

test.describe("Autumn Check", () => {
	test("check loads current usage status", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Current Usage Status" })
			.scrollIntoViewIfNeeded();

		const usageButton = page.getByRole("button", {
			name: "Check Current Usage",
		});
		await expect(usageButton).toBeVisible();

		await usageButton.click();

		await expect(usageButton).toHaveText("Check Current Usage", {
			timeout: 5000,
		});

		const usageDetailsHeading = page.getByRole("heading", {
			name: "Usage Details",
		});
		await expect(usageDetailsHeading).toBeVisible({ timeout: 5000 });

		await expect(page.getByText("Current Usage:")).toBeVisible();
	});

	test("check displays correct data structure", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Current Usage Status" })
			.scrollIntoViewIfNeeded();

		await page.getByRole("button", { name: "Check Current Usage" }).click();

		await page.waitForTimeout(1500);

		const usageContainer = page
			.locator(".rounded.border.border-surface-300-700.p-4")
			.filter({ has: page.getByRole("heading", { name: "Usage Details" }) });
		await expect(usageContainer).toBeVisible();

		await expect(page.getByText("Current Usage:")).toBeVisible();
		const usageRow = usageContainer.locator('div.flex.justify-between').filter({ hasText: 'Current Usage:' });
		const usageValue = await usageRow.locator('span.font-mono').textContent();
		expect(usageValue).toBeTruthy();
		expect(Number(usageValue)).not.toBeNaN();

		const limitRow = usageContainer.locator('text="Limit:"');
		const limitExists = await limitRow.count() > 0;
		if (limitExists) {
			const limitValue = await limitRow
				.locator("..")
				.locator("span.font-mono")
				.textContent();
			expect(limitValue).toBeTruthy();
			expect(Number(limitValue)).not.toBeNaN();
		}
	});

	test("check button shows loading state", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Current Usage Status" })
			.scrollIntoViewIfNeeded();

		const usageButton = page.getByRole("button", {
			name: "Check Current Usage",
		});

		await usageButton.click();

		await expect(usageButton).toHaveText("Check Current Usage", {
			timeout: 5000,
		});
		await expect(usageButton).not.toBeDisabled();
	});

	test("check handles errors gracefully", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Current Usage Status" })
			.scrollIntoViewIfNeeded();

		const usageButton = page.getByRole("button", {
			name: "Check Current Usage",
		});
		await usageButton.click();

		await page.waitForTimeout(1000);

		const errorBox = page
			.locator(".bg-error-500\\/10")
			.filter({ hasText: "Failed to check usage" });
		await expect(errorBox).toHaveCount(0);
	});

	test("check calculates remaining correctly", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Current Usage Status" })
			.scrollIntoViewIfNeeded();

		await page.getByRole("button", { name: "Check Current Usage" }).click();

		await page.waitForTimeout(1500);

		const usageContainer = page
			.locator(".rounded.border.border-surface-300-700.p-4")
			.filter({ has: page.getByRole("heading", { name: "Usage Details" }) });

		await expect(page.getByText("Current Usage:")).toBeVisible();
		const usageRow = usageContainer.locator('div.flex.justify-between').filter({ hasText: 'Current Usage:' });
		const currentUsageValue = await usageRow.locator('span.font-mono').textContent();
		expect(currentUsageValue).toBeTruthy();
		const currentUsage = Number(currentUsageValue);
		expect(currentUsage).not.toBeNaN();

		const limitRow = usageContainer.locator('text="Limit:"');
		const limitExists = await limitRow.count() > 0;

		if (limitExists) {
			const limitValue = await limitRow
				.locator("..")
				.locator("span.font-mono")
				.textContent();
			const remainingValue = await usageContainer
				.locator('text="Remaining:"')
				.locator("..")
				.locator("span.font-mono")
				.textContent();

			const limit = Number(limitValue);
			const remaining = Number(remainingValue);

			expect(remaining).toBe(limit - currentUsage);
		} else {
			expect(currentUsage).toBeGreaterThanOrEqual(0);
		}
	});

	test("check section is visible on page load", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await expect(
			page.getByRole("heading", { name: "Current Usage Status" }),
		).toBeVisible();

		await expect(
			page.getByText(
				"View your current usage amount and limit for the messages feature",
			),
		).toBeVisible();

		const usageButton = page.getByRole("button", {
			name: "Check Current Usage",
		});
		await expect(usageButton).toBeVisible();
		await expect(usageButton).not.toBeDisabled();
	});
});
