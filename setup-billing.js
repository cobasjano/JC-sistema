const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBillingTable() {
  console.log('Checking for tenant_billing table...');
  
  // We can't easily check for table existence via standard API without a query
  // So we try to run a simple query and if it fails with 42P01 (relation does not exist), we try to create it via RPC if available, 
  // or we just inform the user.
  
  const { error } = await supabase.from('tenant_billing').select('id').limit(1);
  
  if (error && error.code === '42P01') {
    console.log('Table tenant_billing does not exist. Please run the following SQL in your Supabase SQL Editor:');
    console.log(`
CREATE TABLE tenant_billing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('payment', 'debt')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tenant_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SuperAdmins can do everything on tenant_billing" ON tenant_billing
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'superadmin'));
    `);
  } else if (error) {
    console.error('Error checking table:', error);
  } else {
    console.log('Table tenant_billing already exists.');
  }
}

setupBillingTable();
