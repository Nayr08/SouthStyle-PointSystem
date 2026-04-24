import { expect, test } from '@playwright/test';
import { getCustomerCredentials } from './utils/credentials';

const customer = getCustomerCredentials();

async function loginCustomer(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 60000 });
  await page.locator('input[inputmode="tel"]').fill(customer!.phone);
  await page.getByRole('button', { name: /continue|next|proceed/i }).click();
  await expect(page.getByText(/enter your mpin/i)).toBeVisible();

  for (const digit of customer!.pin) {
    await page.getByRole('button', { name: digit }).click();
  }

  await expect(page.getByText(/available points/i)).toBeVisible({ timeout: 15000 });
}

test.describe('Customer navigation smoke tests', () => {
  test.beforeEach(async () => {
    test.skip(!customer, 'Set E2E_CUSTOMER_PHONE and E2E_CUSTOMER_PIN to run customer navigation tests.');
  });

  test('opens QR page from account tools', async ({ page }) => {
    await loginCustomer(page);

    await page.getByRole('link', { name: /account/i }).click();
    await page.getByRole('link', { name: /my qr backup/i }).click();

    await expect(page.getByText(/my qr code/i)).toBeVisible();
    await expect(page.getByText(/show this qr to staff/i)).toBeVisible();
  });

  test('opens rewards page and shows redeem history', async ({ page }) => {
    await loginCustomer(page);

    await page.getByRole('link', { name: /account/i }).click();
    await page.getByRole('link', { name: /my rewards/i }).click();

    await expect(page.getByText(/redeem history/i)).toBeVisible();
    await expect(page.getByText(/available rewards/i)).toBeVisible();
  });
});
