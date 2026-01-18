-- Fix expenses_category_check constraint to include new categories
-- Run this in the Supabase SQL Editor

-- First, find the constraint name if it's different, but the error said 'expenses_category_check'
-- We need to drop the old constraint and add the new one

ALTER TABLE expenses 
DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_category_check 
CHECK (category IN ('Compra de Inventario', 'Expensas', 'Luz', 'Internet', 'Agua', 'Otros'));
