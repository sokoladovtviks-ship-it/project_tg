/*
  # Fix category deletion to cascade

  1. Changes
    - Drop existing foreign key constraint on parent_category_id
    - Recreate constraint with ON DELETE CASCADE
    - This ensures when a category is deleted, all its subcategories are also deleted
  
  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_parent_category_id_fkey;

ALTER TABLE categories
  ADD CONSTRAINT categories_parent_category_id_fkey
  FOREIGN KEY (parent_category_id)
  REFERENCES categories(id)
  ON DELETE CASCADE;