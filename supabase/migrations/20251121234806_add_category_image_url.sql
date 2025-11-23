/*
  # Add image URL field to categories

  1. Changes
    - Add `image_url` column to `categories` table to store uploaded logo URLs
    - Column is nullable to maintain backward compatibility with existing emoji-based categories
  
  2. Notes
    - Existing categories will continue using the `icon` field for emojis
    - New categories can use either `icon` (emoji) or `image_url` (uploaded logo)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE categories ADD COLUMN image_url text;
  END IF;
END $$;
