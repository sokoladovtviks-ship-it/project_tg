/*
  # Add visibility control for categories

  1. Changes
    - Add `is_visible` column to categories table
    - Default value is true (visible)
    - This allows admins to hide categories from users without deleting them
  
  2. Notes
    - Existing categories will be visible by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'is_visible'
  ) THEN
    ALTER TABLE categories ADD COLUMN is_visible boolean DEFAULT true NOT NULL;
  END IF;
END $$;
