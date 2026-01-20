-- 1. Create tenants table if not exists
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ensure default tenant exists
INSERT INTO tenants (name, slug) 
VALUES ('Sistema General', 'sistema')
ON CONFLICT (slug) DO NOTHING;

-- 3. Add tenant_id to users if not exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'users'::regclass AND attname = 'tenant_id') THEN
    ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
  END IF;
END $$;

-- 4. Update existing users to have a tenant_id
UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE slug = 'sistema') WHERE tenant_id IS NULL;

-- 5. Set tenant_id to NOT NULL after updating
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;

-- 6. Insert/Update the requested users
-- Password '123' -> sha256: a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
DELETE FROM users WHERE email IN ('adm@sistema.com', 'pos1@sistema.com');

INSERT INTO users (email, password_hash, role, pos_number, name, tenant_id) 
VALUES 
('adm@sistema.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'admin', 0, 'Administrador', (SELECT id FROM tenants WHERE slug = 'sistema')),
('pos1@sistema.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'pos', 1, 'Punto de Venta 1', (SELECT id FROM tenants WHERE slug = 'sistema'));

-- 7. Ensure all other tables have tenant_id (Safety check)
DO $$ 
DECLARE 
    t_id UUID;
BEGIN 
    SELECT id INTO t_id FROM tenants WHERE slug = 'sistema';
    
    -- Products
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'products'::regclass AND attname = 'tenant_id') THEN
        ALTER TABLE products ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        UPDATE products SET tenant_id = t_id;
        ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
    
    -- Sales
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'sales'::regclass AND attname = 'tenant_id') THEN
        ALTER TABLE sales ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        UPDATE sales SET tenant_id = t_id;
        ALTER TABLE sales ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    -- Customers
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'customers'::regclass AND attname = 'tenant_id') THEN
        ALTER TABLE customers ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        UPDATE customers SET tenant_id = t_id;
        ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    -- Expenses
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'expenses'::regclass AND attname = 'tenant_id') THEN
        ALTER TABLE expenses ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        UPDATE expenses SET tenant_id = t_id;
        ALTER TABLE expenses ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    -- Purchase Records
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'purchase_records'::regclass AND attname = 'tenant_id') THEN
        ALTER TABLE purchase_records ADD COLUMN tenant_id UUID REFERENCES tenants(id);
        UPDATE purchase_records SET tenant_id = t_id;
        ALTER TABLE purchase_records ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;
