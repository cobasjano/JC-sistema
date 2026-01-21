const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');
  
  console.log('Filling credentials...');
  await page.fill('input[type="email"]', 'adm@sistema.com');
  await page.fill('input[type="password"]', '123');
  
  console.log('Clicking login button...');
  await page.click('button[type="submit"]', { force: true });
  
  console.log('Waiting for navigation...');
  try {
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    console.log('Login successful! URL:', page.url());
    
    console.log('Clicking on Productos link...');
    await page.click('a[href="/admin/products"]');
    
    console.log('Waiting for products page...');
    await page.waitForURL('**/admin/products', { timeout: 10000 });
    console.log('Products URL:', page.url());
    
    await page.waitForSelector('th:has-text("Stock")', { timeout: 5000 });
    console.log('Stock header found!');
    
    await page.screenshot({ path: 'admin-products.png' });
  } catch (e) {
    console.log('Operation failed:', e.message);
    await page.screenshot({ path: 'error.png' });
  }
  
  await page.screenshot({ path: 'login-result.png' });
  await browser.close();
})();
