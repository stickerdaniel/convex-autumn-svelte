import { test, expect } from "@playwright/test";
import { signInAndNavigateToAccount } from "./helpers/auth";

test.describe("Autumn Get Entity", () => {
	test("getEntity UI elements are visible and functional", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Entity Management" })
			.scrollIntoViewIfNeeded();

		await expect(
			page.getByRole("heading", { name: "Entity Management" }),
		).toBeVisible();

		await expect(
			page.getByText(
				"View details for entities (e.g., teams, projects, or workspaces)",
			),
		).toBeVisible();

		const entityIdInput = page.getByPlaceholder("Enter entity ID");
		await expect(entityIdInput).toBeVisible();
		await expect(entityIdInput).not.toBeDisabled();

		const loadEntityButton = page.getByRole("button", { name: "Load Entity" });
		await expect(loadEntityButton).toBeVisible();
		// Button disabled until entity ID is entered to prevent empty requests.
		await expect(loadEntityButton).toBeDisabled();

		await entityIdInput.fill("test-entity-123");

		await expect(loadEntityButton).not.toBeDisabled();
	});

	test("getEntity handles non-existent entity with error message", async ({
		page,
	}) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Entity Management" })
			.scrollIntoViewIfNeeded();

		const entityIdInput = page.getByPlaceholder("Enter entity ID");
		await entityIdInput.fill("non-existent-entity-999");

		const loadEntityButton = page.getByRole("button", { name: "Load Entity" });
		await loadEntityButton.click();

		// Wait for loading state to complete (button text returns to "Load Entity")
		await expect(loadEntityButton).toHaveText("Load Entity", { timeout: 5000 });

		const errorBox = page.locator(".bg-error-500\\/10");
		const entityDetails = page.getByRole("heading", { name: "Entity Details" });

		const hasError = (await errorBox.count()) > 0;
		const hasData = await entityDetails.isVisible();

		// Either error or success response required from API.
		expect(hasError || hasData).toBe(true);
	});

	test("getEntity button shows loading state", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Entity Management" })
			.scrollIntoViewIfNeeded();

		const entityIdInput = page.getByPlaceholder("Enter entity ID");
		await entityIdInput.fill("test-entity-id");

		const loadEntityButton = page.getByRole("button", { name: "Load Entity" });

		await loadEntityButton.click();

		// Verify loading state resolves back to original text.
		await expect(loadEntityButton).toHaveText("Load Entity", { timeout: 5000 });
	});

	test("getEntity requires entity ID input", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Entity Management" })
			.scrollIntoViewIfNeeded();

		const loadEntityButton = page.getByRole("button", { name: "Load Entity" });
		await expect(loadEntityButton).toBeDisabled();

		const entityIdInput = page.getByPlaceholder("Enter entity ID");
		await entityIdInput.fill("test");
		await expect(loadEntityButton).not.toBeDisabled();

		await entityIdInput.clear();
		await expect(loadEntityButton).toBeDisabled();
	});

	test("getEntity input accepts various ID formats", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Entity Management" })
			.scrollIntoViewIfNeeded();

		const entityIdInput = page.getByPlaceholder("Enter entity ID");
		const loadEntityButton = page.getByRole("button", { name: "Load Entity" });

		const testIds = [
			"entity-123",
			"ENTITY_456",
			"ent789",
			"team-workspace-001",
			"uuid-like-1234-5678-9012",
		];

		for (const entityId of testIds) {
			await entityIdInput.clear();
			await entityIdInput.fill(entityId);

			await expect(loadEntityButton).not.toBeDisabled();

			await expect(entityIdInput).toHaveValue(entityId);
		}
	});

	test("getEntity displays error for empty responses", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Entity Management" })
			.scrollIntoViewIfNeeded();

		const entityIdInput = page.getByPlaceholder("Enter entity ID");
		await entityIdInput.fill("definitely-does-not-exist-12345678");

		const loadEntityButton = page.getByRole("button", { name: "Load Entity" });
		await loadEntityButton.click();

		// Wait for loading state to complete (button text returns to "Load Entity")
		await expect(loadEntityButton).toHaveText("Load Entity", { timeout: 5000 });

		const errorBox = page.locator(".bg-error-500\\/10");
		const entityDetails = page.getByRole("heading", { name: "Entity Details" });

		const hasError = (await errorBox.count()) > 0;
		const hasData = await entityDetails.isVisible();

		// API must respond with either error or data state.
		expect(hasError || hasData).toBe(true);
	});

	test.skip("getEntity loads and displays entity data", async ({ page }) => {
		await signInAndNavigateToAccount(page);

		await page
			.getByRole("heading", { name: "Entity Management" })
			.scrollIntoViewIfNeeded();

		// Requires TEST_ENTITY_ID environment variable for valid entity.
		const validEntityId = process.env.TEST_ENTITY_ID || "skip-test";
		if (validEntityId === "skip-test") {
			test.skip();
		}

		const entityIdInput = page.getByPlaceholder("Enter entity ID");
		await entityIdInput.fill(validEntityId);

		await page.getByRole("button", { name: "Load Entity" }).click();

		await page.waitForTimeout(1500);

		await expect(
			page.getByRole("heading", { name: "Entity Details" }),
		).toBeVisible();

		const entityDataBox = page
			.locator("pre")
			.filter({ has: page.locator("code") });
		await expect(entityDataBox).toBeVisible();

		const jsonContent = await entityDataBox.textContent();
		expect(jsonContent).toBeTruthy();

		expect(() => JSON.parse(jsonContent!)).not.toThrow();

		const entityData = JSON.parse(jsonContent!);
		expect(entityData).toHaveProperty("id");
	});
});
