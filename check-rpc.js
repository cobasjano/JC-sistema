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

async function checkFunction() {
  const { data, error } = await supabase.rpc('decrement_product_stock', {
    p_product_id: 'cdcb6fcd-ab41-4ebe-b186-d89674d80270',
    p_quantity: 0
  });
  
  if (error) {
    console.error('Error calling RPC:', error);
  } else {
    console.log('RPC call successful:', data);
  }
}

checkFunction();
