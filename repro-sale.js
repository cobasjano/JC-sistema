// const fetch = require('node-fetch'); // Use native fetch
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSale() {
  const tenant_id = '85cb72cf-04f1-4dff-9270-ac63eef3c53c';
  const product_id = 'cdcb6fcd-ab41-4ebe-b186-d89674d80270'; // Product "1" we found earlier

  // 1. Check current stock
  const { data: productBefore } = await supabase
    .from('products')
    .select('stock')
    .eq('id', product_id)
    .single();
  
  console.log(`Stock before: ${productBefore.stock}`);

  // 2. Perform a sale via API
  const saleData = {
    posId: '19969835-37c6-4849-a856-131be02d3272', // 1@1 id
    posNumber: 1,
    items: [
      {
        product_id: product_id,
        product_name: '1',
        quantity: 1,
        unit_price: 1,
        subtotal: 1
      }
    ],
    total: 1,
    paymentMethod: 'Efectivo',
    tenant_id: tenant_id
  };

  const response = await fetch('http://localhost:3000/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(saleData)
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Error in API:', data);
    return;
  }

  console.log('Sale created successfully');

  // 3. Check stock after
  const { data: productAfter } = await supabase
    .from('products')
    .select('stock')
    .eq('id', product_id)
    .single();
  
  console.log(`Stock after: ${productAfter.stock}`);

  if (productBefore.stock - productAfter.stock === 1) {
    console.log('SUCCESS: Stock decremented correctly');
  } else {
    console.log('FAILURE: Stock NOT decremented correctly');
  }
}

testSale();
