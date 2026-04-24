import { expect, test } from '@playwright/test';
import { getCustomerCredentials } from './utils/credentials';

const customer = getCustomerCredentials();

test.describe('Customer authentication', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!customer, 'Set E2E_CUSTOMER_PHONE and E2E_CUSTOMER_PIN to run customer auth tests.');
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 60000 });
  });

  test('logs in with a valid phone and MPIN', async ({ page }) => {
    await page.locator('input[inputmode="tel"]').fill(customer!.phone);
    await page.getByRole('button', { name: /continue|next|proceed/i }).click();

    await expect(page.getByText(/enter your mpin/i)).toBeVisible();

    for (const digit of customer!.pin) {
      await page.getByRole('button', { name: digit }).click();
    }

    await expect(page.getByText(/available points/i)).toBeVisible({ timeout: 15000 });
  });

  test('shows an error for an invalid MPIN', async ({ page }) => {
    await page.locator('input[inputmode="tel"]').fill(customer!.phone);
    await page.getByRole('button', { name: /continue|next|proceed/i }).click();

    await expect(page.getByText(/enter your mpin/i)).toBeVisible();

    for (const digit of '0000') {
      await page.getByRole('button', { name: digit }).click();
    }

    await expect(page.getByText(/your mpin is wrong/i)).toBeVisible({ timeout: 15000 });
  });
});
