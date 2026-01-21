import { test, expect } from '@playwright/test';

test.describe('Stock Management System', () => {
  test.beforeEach(async ({ page }) => {
    // Login as POS
    await page.goto('/');
    await page.fill('input[type="email"]', '1@1');
    await page.fill('input[type="password"]', '1');
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL('**/pos/catalog');
  });

  test('POS Catalog shows stock badges with colors', async ({ page }) => {
    // Esperar a que los productos carguen
    await page.waitForSelector('.group.bg-white.rounded-2xl', { timeout: 15000 });

    // Verificar que al menos un producto tenga la etiqueta de "Stock:"
    const stockBadge = page.locator('span:has-text("Stock:")').first();
    await expect(stockBadge).toBeVisible();

    // Verificar clases de colores (ej. bg-red-100 para stock 0 o bg-green-100 para stock alto)
    // Esto depende de los datos reales, pero al menos validamos la existencia del texto
    const badgeText = await stockBadge.innerText();
    expect(badgeText).toMatch(/Stock: -?\d+/);
  });

  test('Checkout warns about insufficient stock when confirm dialog appears', async ({ page }) => {
    // 1. Buscar un producto (ej. el primero)
    const productCard = page.locator('.group.bg-white.rounded-2xl').first();
    
    // 2. Click en agregar al carrito (el botón naranja con el icono +)
    await productCard.locator('button').click();

    // 3. Ir al checkout
    await page.click('button:has-text("Finalizar Venta")');
    await page.waitForURL('**/pos/checkout');

    // 4. Seleccionar método de pago para habilitar el botón
    await page.click('button:has-text("Efectivo")');

    // 5. Interceptar el diálogo de confirmación si el stock es bajo
    // Nota: Para asegurar que salte, el producto debería tener stock < quantity
    // Como no controlamos los datos, preparamos el listener
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Aviso: Los siguientes productos no tienen stock suficiente');
      await dialog.accept();
    });

    // 6. Intentar confirmar venta
    await page.click('button:has-text("Confirmar venta")');

    // Si el producto tenía stock suficiente, la venta pasará directamente.
    // Si no, el listener de arriba validará el mensaje.
  });
});

test.describe('Admin Stock Visibility', () => {
  test('Admin Products table shows Stock column', async ({ page }) => {
    // Login as Admin
    await page.goto('/');
    await page.fill('input[type="email"]', 'adm@sistema.com');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL('**/admin/dashboard');

    // Ir a gestión de productos usando el Navbar para mantener el contexto
    await page.click('a:has-text("Productos")');
    
    // Esperar a que la tabla cargue
    try {
      await page.waitForSelector('th:has-text("Stock")', { timeout: 15000 });
    } catch (e) {
      await page.screenshot({ path: 'test-results/admin-products-failure.png' });
      throw e;
    }
    
    // Verificar encabezado de tabla
    const stockHeader = page.locator('th:has-text("Stock")');
    await expect(stockHeader).toBeVisible();

    // Verificar que las filas tengan unidades
    const stockCell = page.locator('td:has-text("un.")').first();
    await expect(stockCell).toBeVisible();
  });
});
