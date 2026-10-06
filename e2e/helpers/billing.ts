import { expect, type Page } from '@playwright/test';

import { readJson, waitForOperation } from './fixtures';

/** Complete the hosted sandbox flow when a fresh customer has no payment method. */
export async function attachPro(page: Page) {
	const harnessUrl = page.url();
	await page.getByTestId('run-attach').click();
	const result = await waitForOperation(page, 'attach');
	expect(Number(await page.getByTestId('invalidate-count').textContent())).toBeGreaterThan(0);

	if (result?.checkout_url) {
		const checkoutUrl = new URL(result.checkout_url);
		expect(checkoutUrl.origin).toBe('https://checkout.stripe.com');
		expect(checkoutUrl.pathname).toMatch(/^\/c\/pay\/cs_test_/);
		await page.goto(checkoutUrl.href);
		await expect(page.getByText('Sandbox', { exact: true })).toBeVisible();
		await page.getByLabel('Card number', { exact: true }).fill('4242424242424242');
		const expiryYear = String(new Date().getUTCFullYear() + 3).slice(-2);
		await page.getByLabel('Expiration', { exact: true }).fill(`12${expiryYear}`);
		await page
			.getByRole('textbox', { name: 'Credit or debit card CVC/CVV', exact: true })
			.fill('123');
		await page.locator('#billingName').fill('Autumn E2E');
		await page.getByLabel('Country or region', { exact: true }).selectOption('US');
		await page.locator('#billingPostalCode').fill('94107');
		await page.locator('#optInSetupFutureUsageCheckbox').uncheck();
		await page.getByTestId('hosted-payment-submit-button').click();
		await page.waitForURL(harnessUrl, { timeout: 30_000 });
		// Stripe's redirect and Autumn's webhook can arrive in either order.
		await expect
			.poll(
				async () => {
					await page.reload();
					return (await readJson(page, 'customer-current'))?.products ?? [];
				},
				{ timeout: 15_000 }
			)
			.toContain('pro');
	} else {
		await expect
			.poll(async () => (await readJson(page, 'customer-current'))?.products ?? [])
			.toContain('pro');
	}
}
