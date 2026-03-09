import { expect, type Page } from "@playwright/test";

import { signIn, signInAsPrimary, signInAsSecondary, signOut } from "./auth";

export async function readJson(page: Page, testId: string) {
	const content = await page.getByTestId(testId).textContent();
	return content ? JSON.parse(content) : null;
}

export async function openHarness(
	page: Page,
	route: string,
	secret?: string,
) {
	await page.goto(route);

	if (page.url().includes("/signin")) {
		await signIn(page, secret);
		await page.goto(route);
	}

	await expect(page.getByTestId("mode")).toBeVisible();
}

export async function resetHarnessState(
	page: Page,
	route: string,
	secret?: string,
) {
	await openHarness(page, route, secret);
	await page.getByTestId("run-reset").click();

	await expect
		.poll(async () => {
			const customer = await readJson(page, "customer-current");
			return customer?.products ?? [];
		})
		.toContain("free");
}

export async function resetPrimaryUser(page: Page, route = "/__e2e/sveltekit") {
	await signOut(page);
	await signInAsPrimary(page);
	await resetHarnessState(page, route);
}

export async function resetSecondaryUser(page: Page, route = "/__e2e/sveltekit") {
	await signOut(page);
	await signInAsSecondary(page);
	await resetHarnessState(page, route);
}
