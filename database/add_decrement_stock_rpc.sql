-- Función para decrementar el stock de un producto
CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE products
    SET stock = stock - p_quantity
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
