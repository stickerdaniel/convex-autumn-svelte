import type { Page } from "@playwright/test";

/**
 * Shared authentication helpers for e2e tests.
 */

const primarySecret =
	process.env.AUTH_E2E_TEST_SECRET_PRIMARY ?? process.env.AUTH_E2E_TEST_SECRET;
const secondarySecret = process.env.AUTH_E2E_TEST_SECRET_SECONDARY;

function requireSecret(secret: string | undefined, label: string): string {
	if (!secret) {
		throw new Error(`Missing ${label} environment variable for E2E auth.`);
	}

	return secret;
}

/**
 * Sign in with the test user.
 *
 * @param page - The Playwright page instance.
 */
export async function signIn(page: Page, secret = requireSecret(primarySecret, "AUTH_E2E_TEST_SECRET_PRIMARY")): Promise<void> {
	await page.goto("/signin");
	await page.getByLabel("Secret").fill(secret);
	await page.getByRole("button").getByText("Sign in with secret").click();
	await page.waitForURL("/product");
}

export async function signInAsPrimary(page: Page): Promise<void> {
	await signIn(page, requireSecret(primarySecret, "AUTH_E2E_TEST_SECRET_PRIMARY"));
}

export async function signInAsSecondary(page: Page): Promise<void> {
	await signIn(page, requireSecret(secondarySecret, "AUTH_E2E_TEST_SECRET_SECONDARY"));
}

/**
 * Sign out the current user.
 *
 * @param page - The Playwright page instance.
 */
export async function signOut(page: Page): Promise<void> {
	await page.context().clearCookies();
	await page.goto("/");
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
	await signInAsPrimary(page);
	await page.goto("/account");
	await page.waitForURL("/account");
}
