import { test, expect } from '@playwright/test';

test.describe('Stock Decrement Verification', () => {
  let initialStock = 0;

  test('should decrement stock by 1 after a sale', async ({ page }) => {
    // 1. Login as Admin to check initial stock
    await page.goto('/');
    await page.fill('input[type="email"]', 'adm@sistema.com');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL('**/admin/dashboard');

    // Go to products and find the stock
    await page.click('a:has-text("Productos")');
    
    // In the screenshot we saw "TEST" (uppercase), now it is "1"
    const productRow = page.locator('tr').filter({ hasText: '1' }).first();
    await expect(productRow).toBeVisible();
    
    const stockText = await productRow.locator('td').nth(2).innerText();
    initialStock = parseInt(stockText.replace(' un.', ''));
    console.log(`Initial stock for product "1": ${initialStock}`);

    // Logout
    await page.click('button:has-text("Salir")');

    // 2. Login as POS to perform a sale
    await page.fill('input[type="email"]', '1@1');
    await page.fill('input[type="password"]', '1');
    
    // Handle potential alerts
    page.on('dialog', async dialog => {
      console.log(`Dialog appeared: ${dialog.message()}`);
      await dialog.accept();
    });

    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL('**/pos/catalog');

    // Add product "1" to cart
    console.log('Adding product to cart...');
    const productCard = page.locator('.group', { hasText: '1' }).first();
    await productCard.locator('button').click();
    
    // Checkout
    console.log('Navigating to checkout...');
    await page.click('button:has-text("Finalizar Venta")');
    await page.waitForURL('**/pos/checkout');
    
    console.log('Selecting payment method...');
    await page.click('button:has-text("Efectivo")');
    
    try {
      console.log('Confirming sale...');
      await page.click('button:has-text("Confirmar venta")');
      // Wait for confirmation with a more flexible check
      await page.waitForURL(url => url.pathname.includes('/pos/confirmation'), { timeout: 20000 });
      console.log('Successfully reached confirmation page');
    } catch (e) {
      await page.screenshot({ path: 'test-results/sale-failure-2.png' });
      const currentUrl = page.url();
      console.log(`Failed at URL: ${currentUrl}`);
      throw e;
    }
    
    await expect(page.locator('h1')).toContainText('¡Venta completada!');

    // Logout
    await page.click('button:has-text("Salir")');

    // 3. Login as Admin again to verify stock decrement
    await page.fill('input[type="email"]', 'adm@sistema.com');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL('**/admin/dashboard');

    await page.click('a:has-text("Productos")');
    const updatedProductRow = page.locator('tr').filter({ hasText: '1' }).first();
    const updatedStockText = await updatedProductRow.locator('td').nth(2).innerText();
    const finalStock = parseInt(updatedStockText.replace(' un.', ''));
    
    console.log(`Final stock for product "1": ${finalStock}`);
    
    expect(finalStock).toBe(initialStock - 1);
  });
});
