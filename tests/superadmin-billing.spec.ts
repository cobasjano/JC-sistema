import { test, expect } from '@playwright/test';

test.describe('SuperAdmin Billing and Blocking', () => {
  const SUPERADMIN_ID = '11111111-1111-1111-1111-111111111111';
  const TENANT_ID = '22222222-2222-2222-2222-222222222222';
  const ADMIN_ID = '33333333-3333-3333-3333-333333333333';

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // Mock global stats
    await page.route('**/rest/v1/rpc/get_global_stats*', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total_revenue: 1000, total_sales: 10, tenant_count: 1 })
      });
    });

    // Mock billing (default empty)
    await page.route('**/rest/v1/tenant_billing*', async (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      } else {
        route.continue();
      }
    });
  });

  async function setupAuth(page, role: 'superadmin' | 'admin', isActive = true) {
    await page.route('**/rest/v1/tenants*', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: TENANT_ID,
          name: 'Comercio Demo',
          slug: 'demo',
          is_active: isActive,
          created_at: new Date().toISOString(),
          settings: { 
            pos_names: { 1: 'POS 1' },
            pos_locations: { 1: 'Default' },
            weather_coordinates: { 'Default': { lat: -34.6, lon: -58.4 } }
          }
        }])
      });
    });

    await page.goto('/');
    await page.evaluate(({ role, TENANT_ID, SUPERADMIN_ID, ADMIN_ID, isActive }) => {
      const user = role === 'superadmin' 
        ? { id: SUPERADMIN_ID, email: 'super@admin.com', role: 'superadmin', name: 'Super Admin' }
        : { id: ADMIN_ID, email: 'adm@sistema.com', role: 'admin', name: 'Admin Demo', tenant_id: TENANT_ID };
      
      const tenant = role === 'superadmin' ? null : {
        id: TENANT_ID,
        name: 'Comercio Demo',
        slug: 'demo',
        is_active: isActive,
        created_at: new Date().toISOString(),
        settings: { 
          pos_names: { 1: 'POS 1' },
          pos_locations: { 1: 'Default' },
          weather_coordinates: { 'Default': { lat: -34.6, lon: -58.4 } }
        }
      };

      const state = { user, tenant, token: 'fake-token' };
      localStorage.setItem('auth-store', JSON.stringify({ state, version: 0 }));
    }, { role, TENANT_ID, SUPERADMIN_ID, ADMIN_ID, isActive });
  }

  test('should show block/unblock toggle and change status', async ({ page }) => {
    await setupAuth(page, 'superadmin');
    await page.goto('/superadmin/dashboard');
    await expect(page).toHaveURL('/superadmin/dashboard');

    const blockButton = page.locator('button:has-text("Bloquear")');
    await expect(blockButton).toBeVisible({ timeout: 10000 });

    // Mock update status
    await page.route(`**/rest/v1/tenants?id=eq.${TENANT_ID}`, async (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    // Mock refetch after update
    await page.route('**/rest/v1/tenants*', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: TENANT_ID,
          name: 'Comercio Demo',
          slug: 'demo',
          is_active: false,
          created_at: new Date().toISOString(),
          settings: { 
            pos_names: { 1: 'POS 1' },
            pos_locations: { 1: 'Default' },
            weather_coordinates: { 'Default': { lat: -34.6, lon: -58.4 } }
          }
        }])
      });
    });

    await blockButton.click();
    await expect(page.locator('button:has-text("Desbloquear")')).toBeVisible();
    await expect(page.locator('text=● Bloqueado')).toBeVisible();
  });

  test('should manage billing history and balance', async ({ page }) => {
    await setupAuth(page, 'superadmin');
    await page.goto('/superadmin/dashboard');

    // Mock billing history
    await page.route('**/rest/v1/tenant_billing*', async (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: '1', tenant_id: TENANT_ID, amount: 1000, type: 'debt', description: 'Debt 1', created_at: new Date().toISOString() },
            { id: '2', tenant_id: TENANT_ID, amount: 500, type: 'payment', description: 'Payment 1', created_at: new Date().toISOString() }
          ])
        });
      } else if (route.request().method() === 'POST') {
        route.fulfill({ status: 201 });
      }
    });

    // Open billing modal
    await page.click('button[title="Facturación"]');
    await expect(page.locator('text=Pagos y Deudas: Comercio Demo')).toBeVisible({ timeout: 10000 });

    // Verify balance ($1000 debt - $500 payment = $500)
    await expect(page.locator('text=Balance actual: $500')).toBeVisible();

    // Add new transaction
    await page.fill('input[placeholder="0.00"]', '200');
    await page.selectOption('select', 'debt');
    await page.fill('input[placeholder="Ej: Pago mensualidad Enero"]', 'New Debt');
    
    // Mock update for history after add
    await page.route('**/rest/v1/tenant_billing*', async (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: '3', tenant_id: TENANT_ID, amount: 200, type: 'debt', description: 'New Debt', created_at: new Date().toISOString() },
            { id: '1', tenant_id: TENANT_ID, amount: 1000, type: 'debt', description: 'Debt 1', created_at: new Date().toISOString() },
            { id: '2', tenant_id: TENANT_ID, amount: 500, type: 'payment', description: 'Payment 1', created_at: new Date().toISOString() }
          ])
        });
      } else {
        route.fulfill({ status: 201 });
      }
    });

    await page.click('button:has-text("Registrar")');
    await expect(page.locator('text=Balance actual: $700')).toBeVisible();
    await expect(page.locator('text=New Debt')).toBeVisible();
  });

  test('should show suspension screen when tenant is blocked and show balance', async ({ page }) => {
    // Mock positive balance for this test
    await page.route('**/rest/v1/tenant_billing*', async (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: '1', tenant_id: TENANT_ID, amount: 1500, type: 'debt', created_at: new Date().toISOString() }
          ])
        });
      }
    });

    await setupAuth(page, 'admin', false);
    
    await page.goto('/admin/dashboard');

    // Wait for loading to finish
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 15000 });

    // Should be intercepted by TenantBlocker
    await expect(page.locator('text=Acceso Suspendido')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=ha sido suspendido temporalmente')).toBeVisible();
    
    // Should show the balance
    await expect(page.locator('text=$1,500')).toBeVisible();
    await expect(page.locator('text=Saldo Pendiente')).toBeVisible();
    
    // Should have a logout button
    await page.click('button:has-text("Cerrar Sesión")');
    await expect(page).toHaveURL('/');
  });

  test('admin should be able to see their own billing page', async ({ page }) => {
    // Mock billing history for admin
    await page.route('**/rest/v1/tenant_billing*', async (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: '1', tenant_id: TENANT_ID, amount: 1500, type: 'debt', description: 'Cargo Mensual', created_at: new Date().toISOString() },
            { id: '2', tenant_id: TENANT_ID, amount: 500, type: 'payment', description: 'Pago Parcial', created_at: new Date().toISOString() }
          ])
        });
      }
    });

    await setupAuth(page, 'admin', true);
    await page.goto('/admin/billing');

    await expect(page.locator('h1')).toContainText('Estado de Facturación');
    await expect(page.locator('text=$1,000')).toBeVisible(); // 1500 - 500
    await expect(page.locator('text=Cargo Mensual')).toBeVisible();
    await expect(page.locator('text=Pago Parcial')).toBeVisible();
  });
});
