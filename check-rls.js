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

async function checkRLS() {
  const { data, error } = await supabase
    .from('products')
    .update({ name: 'Test' })
    .eq('id', 'cdcb6fcd-ab41-4ebe-b186-d89674d80270')
    .select();
  
  if (error) {
    console.log('Update failed (RLS likely on):', error.message);
  } else {
    console.log('Update successful (RLS likely off or allowed):', data);
  }
}

checkRLS();
