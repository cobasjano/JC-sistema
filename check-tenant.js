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

async function checkTenantSettings() {
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', '85cb72cf-04f1-4dff-9270-ac63eef3c53c')
    .single();
  
  if (error) console.error(error);
  else console.log(JSON.stringify(tenant.settings, null, 2));
}

checkTenantSettings();
