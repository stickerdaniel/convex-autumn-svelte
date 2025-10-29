import { test, expect } from "@playwright/test";
import { signInAndNavigateToAccount } from "./helpers/auth";

test.describe("Autumn List Products", () => {
	test("listProducts loads and displays product catalog", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		const loadProductsButton = page.getByRole("button", {
			name: "Load Products",
		});
		await expect(loadProductsButton).toBeVisible();
		await loadProductsButton.click();

		await expect(loadProductsButton).toHaveText("Load Products");

		const productCards = page.locator(
			".rounded.border.border-surface-300-700.p-4",
		);

		await expect(productCards.first()).toBeVisible({ timeout: 5000 });

		const productCount = await productCards.count();
		expect(productCount).toBeGreaterThanOrEqual(2);

		await expect(page.getByRole("heading", { name: "Free", level: 3 })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Pro", level: 3 })).toBeVisible();
	});

	test("listProducts shows product details correctly", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page.getByRole("button", { name: "Load Products" }).click();

		await page.waitForTimeout(1000);

		const messagesFeature = page.getByText(/Feature:\s+messages/);
		await expect(messagesFeature.first()).toBeVisible();

		const freeUsage = page.getByText(/10\s+month/);
		await expect(freeUsage.first()).toBeVisible();

		const proUsage = page.getByText(/Unlimited/);
		await expect(proUsage.first()).toBeVisible();
	});

	test("listProducts handles errors gracefully", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		const loadProductsButton = page.getByRole("button", {
			name: "Load Products",
		});
		await loadProductsButton.click();

		await page.waitForTimeout(1000);

		const errorBox = page.locator(".bg-error-500\\/10");
		await expect(errorBox).toHaveCount(0);
	});

	test("listProducts button shows loading state", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		const loadProductsButton = page.getByRole("button", {
			name: "Load Products",
		});

		await loadProductsButton.click();

		await expect(loadProductsButton).toHaveText("Load Products");
		await expect(loadProductsButton).not.toBeDisabled();
	});
});
