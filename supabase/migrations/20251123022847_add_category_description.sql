/*
  # Add description field to categories

  1. Changes
    - Add `description` column to categories table
    - Add `description_en` column for English descriptions
    
  2. Notes
    - Descriptions are optional and can be null
    - Used for providing additional information about categories
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'description'
  ) THEN
    ALTER TABLE categories ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'description_en'
  ) THEN
    ALTER TABLE categories ADD COLUMN description_en text;
  END IF;
END $$;