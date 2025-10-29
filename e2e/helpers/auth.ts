import type { Page } from "@playwright/test";

/**
 * Shared authentication helpers for e2e tests.
 */

/**
 * Sign in with the test user.
 *
 * @param page - The Playwright page instance.
 */
export async function signIn(page: Page): Promise<void> {
	await page.goto("/signin");
	await page.getByLabel("Secret").fill(process.env.AUTH_E2E_TEST_SECRET!);
	await page.getByRole("button").getByText("Sign in with secret").click();
	await page.waitForURL("/product");
}

/**
 * Sign out the current user.
 *
 * @param page - The Playwright page instance.
 */
export async function signOut(page: Page): Promise<void> {
	const currentUrl = page.url();
	if (!currentUrl.includes("/product")) {
		await page.goto("/product");
	}

	await page.locator("#user-menu-trigger").click();
	await page.getByRole("button").getByText("Sign out").click();
}

/**
 * Navigate to the account page, handling authentication if required.
 *
 * @param page - The Playwright page instance.
 */
export async function navigateToAccount(page: Page): Promise<void> {
	await page.goto("/account");

	if (page.url().includes("/signin")) {
		await signIn(page);
		await page.goto("/account");
	}

	await page.waitForURL("/account");
}

/**
 * Complete auth flow and navigate to account page.
 *
 * @param page - The Playwright page instance.
 */
export async function signInAndNavigateToAccount(page: Page): Promise<void> {
	await signIn(page);
	await page.goto("/account");
	await page.waitForURL("/account");
}
