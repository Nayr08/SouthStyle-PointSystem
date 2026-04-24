import { expect, test } from '@playwright/test';
import { getAdminCredentials } from './utils/credentials';

const admin = getAdminCredentials();

test.describe('Admin authentication', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!admin, 'Set E2E_ADMIN_PHONE and E2E_ADMIN_PIN to run admin auth tests.');
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto(`/admin/login?phone=${encodeURIComponent(admin!.phone)}`);
    await expect(page.getByRole('heading', { name: /staff login/i })).toBeVisible({ timeout: 15000 });
  });

  test('logs in with a valid admin number and PIN', async ({ page }) => {
    await page.getByPlaceholder('09170000000').fill(admin!.phone);
    await page.getByPlaceholder('1234').fill(admin!.pin);
    await page.getByRole('button', { name: /login|checking/i }).click();

    await page.waitForURL('**/admin', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /admin dashboard|staff dashboard/i })).toBeVisible();
  });

  test('shows an error for an invalid admin PIN', async ({ page }) => {
    await page.getByPlaceholder('09170000000').fill(admin!.phone);
    await page.getByPlaceholder('1234').fill('0000');
    await page.getByRole('button', { name: /login|checking/i }).click();

    await expect(page.getByText(/invalid admin number or pin/i)).toBeVisible({ timeout: 15000 });
  });
});
