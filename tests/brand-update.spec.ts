import { test, expect } from '@playwright/test';

test.describe('Brand Update Verification', () => {
  test('should display "SISTEMA JC" on the login page', async ({ page }) => {
    await page.goto('/');
    // The logo is split into "SISTEMA" and "JC" (inside a span)
    const header = page.locator('h1');
    await expect(header).toContainText('SISTEMA');
    await expect(header).toContainText('JC');
  });

  test('should display "SISTEMA JC" in the Navbar after login', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/dashboard');
    
    const navbarLogo = page.locator('nav').first();
    await expect(navbarLogo).toContainText('SISTEMA');
    await expect(navbarLogo).toContainText('JC');
  });
});
