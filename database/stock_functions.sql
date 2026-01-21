-- Función para decrementar el stock de un producto (usada en Ventas)
CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE products
    SET stock = COALESCE(stock, 0) - p_quantity
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Función para incrementar el stock de un producto (usada en Compras)
CREATE OR REPLACE FUNCTION increment_product_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE products
    SET stock = COALESCE(stock, 0) + p_quantity
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
