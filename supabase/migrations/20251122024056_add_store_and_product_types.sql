/*
  # Add Store and Product Type System

  ## Changes Made

  ### 1. Store Table Updates
  - Add `store_type` column (digital/physical) to determine store type
  - Add `theme_color` column for customizable store theme
  
  ### 2. Categories Table Updates
  - Add `category_type` column to support different product types
  - Add `product_subtype` column for digital products (accounts/subscriptions)
  
  ### 3. Products Table Updates
  - Add support for multiple images array
  - Add `payment_methods` column (array of payment method IDs)
  - Add `product_type` column (digital/physical)
  
  ### 4. Product Images Table
  - New table for managing multiple product images with order
  
  ## Important Notes
  - Store type determines available categories and products
  - Digital products can be accounts or subscriptions
  - Products can have specific payment methods
*/

-- Add store type and theme color to stores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'store_type'
  ) THEN
    ALTER TABLE stores ADD COLUMN store_type text DEFAULT 'physical' CHECK (store_type IN ('digital', 'physical'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'theme_color'
  ) THEN
    ALTER TABLE stores ADD COLUMN theme_color text DEFAULT '#3B82F6';
  END IF;
END $$;

-- Add category type and product subtype to categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'category_type'
  ) THEN
    ALTER TABLE categories ADD COLUMN category_type text DEFAULT 'physical' CHECK (category_type IN ('digital', 'physical'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'product_subtype'
  ) THEN
    ALTER TABLE categories ADD COLUMN product_subtype text CHECK (product_subtype IN ('accounts', 'subscriptions', NULL));
  END IF;
END $$;

-- Add product type and payment methods to products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE products ADD COLUMN product_type text DEFAULT 'physical' CHECK (product_type IN ('digital', 'physical'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'payment_methods'
  ) THEN
    ALTER TABLE products ADD COLUMN payment_methods uuid[] DEFAULT ARRAY[]::uuid[];
  END IF;
END $$;

-- Create product_images table for multiple images support
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  order_position integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_images
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN admins a ON a.store_id = (SELECT store_id FROM categories WHERE id = p.category_id)
      WHERE p.id = product_images.product_id
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON product_images(product_id, order_position);
