-- MIGRATION TO SAAS (Multi-tenancy)

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add tenant_id to users
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- 3. Add tenant_id to products
ALTER TABLE products ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- 4. Add tenant_id to customers
ALTER TABLE customers ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- 5. Add tenant_id to sales
ALTER TABLE sales ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- 6. Add tenant_id to expenses
ALTER TABLE expenses ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- 7. Add tenant_id to purchase_records
ALTER TABLE purchase_records ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- 8. Add tenant_id to sessions (Optional but good for security)
-- ALTER TABLE sessions ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- 9. Create a default tenant for existing data
INSERT INTO tenants (name, slug) VALUES ('Default Tenant', 'default');

-- 10. Assign all existing records to the default tenant
UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default');
UPDATE products SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default');
UPDATE customers SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default');
UPDATE sales SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default');
UPDATE expenses SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default');
UPDATE purchase_records SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default');

-- 11. Make tenant_id NOT NULL after assigning defaults
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE sales ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE purchase_records ALTER COLUMN tenant_id SET NOT NULL;

-- 12. Update unique constraint on users to be (email, tenant_id) instead of just email
-- This allows different tenants to have the same user email (though usually not recommended, it's safer for SaaS)
-- However, for simplicity and typical SaaS, we might keep email unique globally or per tenant.
-- Let's stick to unique globally for now to avoid confusion, or per tenant if preferred.
-- The user said "volverlo general", usually meaning multi-tenant.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ADD CONSTRAINT users_email_tenant_unique UNIQUE (email, tenant_id);

-- 13. Update indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_sales_tenant_id ON sales(tenant_id);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_expenses_tenant_id ON expenses(tenant_id);
