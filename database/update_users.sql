-- Limpiar todos los usuarios previos
DELETE FROM users;

-- Insertar nuevas credenciales solicitadas
-- Contraseña '123' (hash SHA-256: a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3)
INSERT INTO users (email, password_hash, role, pos_number, name) VALUES
('pos1@sistema.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'pos', 1, 'Punto de Venta 1'),
('adm@sistema.com', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'admin', 0, 'Administrador');
