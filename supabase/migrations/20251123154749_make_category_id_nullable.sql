/*
  # Make category_id nullable in products table

  1. Changes
    - Alter products table to make category_id nullable
    - This allows creating products without assigning them to a category
*/

ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL;
