-- UNIFIED SCHEMA FOR JC SISTEMA
-- Ejecuta este script completo en el SQL Editor de Supabase

-- 1. LIMPIEZA
DROP TABLE IF EXISTS purchase_records CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS egresos CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. TABLA DE USUARIOS
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'pos')),
  pos_number INTEGER DEFAULT 0,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE CLIENTES
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone_number VARCHAR(50),
  address TEXT,
  pos_number INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE PRODUCTOS
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url VARCHAR(500),
  category VARCHAR(100),
  subcategory VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE VENTAS
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pos_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pos_number INTEGER NOT NULL,
  total DECIMAL(12, 2) NOT NULL,
  items JSONB NOT NULL, -- Contiene array de {product_id, product_name, quantity, price}
  payment_method VARCHAR(50) NOT NULL,
  payment_breakdown JSONB, -- Para pagos combinados
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA DE EGRESOS (Gastos)
CREATE TABLE egresos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  pos_number INTEGER DEFAULT 0,
  category VARCHAR(100),
  items JSONB, -- Array de ExpenseItem
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  payment_status VARCHAR(50) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
  check_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE SESIONES
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLA DE REGISTRO DE COMPRAS (Stock)
CREATE TABLE purchase_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  purchase_price DECIMAL(12, 2) NOT NULL,
  total_cost DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ÍNDICES PARA VELOCIDAD
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_sales_pos_number ON sales(pos_number);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_egresos_created_at ON egresos(created_at);
CREATE INDEX idx_customers_full_name ON customers(full_name);
CREATE INDEX idx_sessions_token ON sessions(token);

-- 10. INSERCIÓN DE USUARIOS INICIALES (Contraseña: 123)
-- Hash SHA-256 de '123': a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
INSERT INTO users (email, password_hash, role, pos_number, name) VALUES
('pos1@sistema.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'pos', 1, 'Punto de Venta 1'),
('adm@sistema.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'admin', 0, 'Administrador');
