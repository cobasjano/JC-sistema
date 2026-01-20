-- Fix data retention for sales and expenses when users are deleted

-- 1. Modify sales table
-- First, make pos_id nullable
ALTER TABLE sales ALTER COLUMN pos_id DROP NOT NULL;

-- Remove the existing foreign key constraint if it exists (it might have a default name)
-- We'll use a DO block to find and drop it to be safe
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name 
    INTO constraint_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'sales' 
      AND kcu.column_name = 'pos_id';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE sales DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Add the new constraint with ON DELETE SET NULL
ALTER TABLE sales 
ADD CONSTRAINT sales_pos_id_fkey 
FOREIGN KEY (pos_id) 
REFERENCES users(id) 
ON DELETE SET NULL;


-- 2. Modify expenses table
-- created_by is already nullable, but let's ensure the constraint is ON DELETE SET NULL
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT tc.constraint_name 
    INTO constraint_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'expenses' 
      AND kcu.column_name = 'created_by';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE expenses DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES users(id) 
ON DELETE SET NULL;
