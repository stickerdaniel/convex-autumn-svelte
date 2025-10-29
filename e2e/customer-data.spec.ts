import { test, expect } from "@playwright/test";
import { signInAndNavigateToAccount } from "./helpers/auth";

test.describe("Autumn Customer Data", () => {
	test("customer data is fetched and displayed on account page", async ({
		page,
	}) => {
		await signInAndNavigateToAccount(page);

		await expect(
			page.getByRole("heading", { name: "Account Information" }),
		).toBeVisible();

		const customerIdRow = page.locator('text="Customer ID:"').locator("..");
		await expect(customerIdRow).toBeVisible();
		const customerId = await customerIdRow
			.locator("span.font-mono")
			.textContent();
		expect(customerId).toBeTruthy();
		expect(customerId).not.toBe("");

		const emailRow = page.locator('text="Email:"').locator("..");
		await expect(emailRow).toBeVisible();
		const email = await emailRow.locator("span").last().textContent();
		expect(email).toBe("secret@secret.com");

		// Test user defaults to Free plan on creation.
		const planRow = page.locator('text="Plan:"').locator("..");
		await expect(planRow).toBeVisible();
		const plan = await planRow.locator("span.font-semibold").textContent();
		expect(plan).toBeTruthy();
		expect(plan).toMatch(/^(Free|⭐ Pro)$/);
	});

	test("customer data structure is valid", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await expect(
			page.getByRole("heading", { name: "Account Information" }),
		).toBeVisible();

		await expect(
			page.getByRole("heading", { name: "Payment Methods" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Product Catalog" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Referral Program" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Usage Analytics" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Current Usage Status" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Entity Management" }),
		).toBeVisible();

		const errorMessages = page.locator(".text-error-500");
		await expect(errorMessages).toHaveCount(0);
	});
});
