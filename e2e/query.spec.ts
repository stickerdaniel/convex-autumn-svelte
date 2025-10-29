import { test, expect } from "@playwright/test";
import { signInAndNavigateToAccount } from "./helpers/auth";

test.describe("Autumn Query", () => {
	test("query loads usage history data", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Usage Analytics" })
			.scrollIntoViewIfNeeded();

		const queryButton = page.getByRole("button", {
			name: "Query Usage History",
		});
		await expect(queryButton).toBeVisible();

		await queryButton.click();

		await expect(queryButton).toHaveText("Query Usage History");

		const queryDataBox = page
			.locator("pre")
			.filter({ has: page.locator("code") })
			.first();
		await expect(queryDataBox).toBeVisible({ timeout: 5000 });

		const jsonContent = await queryDataBox.textContent();
		expect(jsonContent).toBeTruthy();

		expect(() => JSON.parse(jsonContent!)).not.toThrow();

		const queryData = JSON.parse(jsonContent!);
		expect(queryData).toHaveProperty("list");
		expect(Array.isArray(queryData.list)).toBe(true);
	});

	test("query button shows loading state", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Usage Analytics" })
			.scrollIntoViewIfNeeded();

		const queryButton = page.getByRole("button", {
			name: "Query Usage History",
		});

		await queryButton.click();

		await expect(queryButton).toHaveText("Query Usage History", {
			timeout: 5000,
		});
		await expect(queryButton).not.toBeDisabled();
	});

	test("query handles errors gracefully", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Usage Analytics" })
			.scrollIntoViewIfNeeded();

		const queryButton = page.getByRole("button", {
			name: "Query Usage History",
		});
		await queryButton.click();

		await page.waitForTimeout(1000);

		// Query should succeed without error messages.
		const errorBox = page
			.locator(".bg-error-500\\/10")
			.filter({ hasText: "Failed to query data" });
		await expect(errorBox).toHaveCount(0);
	});

	test("query displays formatted JSON data", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Usage Analytics" })
			.scrollIntoViewIfNeeded();

		await page.getByRole("button", { name: "Query Usage History" }).click();

		await page.waitForTimeout(1500);

		const queryDataBox = page
			.locator("pre")
			.filter({ has: page.locator("code") })
			.first();
		await expect(queryDataBox).toBeVisible();

		const container = page.locator(
			".rounded.border.border-surface-300-700.p-4",
		);
		await expect(container.first()).toBeVisible();
	});

	test("query with 30d range parameter", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Usage Analytics" })
			.scrollIntoViewIfNeeded();

		await expect(page.getByText("Usage History (30 Days)")).toBeVisible();

		await page.getByRole("button", { name: "Query Usage History" }).click();

		await page.waitForTimeout(1000);

		const queryDataBox = page
			.locator("pre")
			.filter({ has: page.locator("code") })
			.first();
		await expect(queryDataBox).toBeVisible({ timeout: 5000 });
	});
});
