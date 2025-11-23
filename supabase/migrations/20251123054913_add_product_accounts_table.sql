/*
  # Add Product Accounts System

  ## Overview
  This migration creates a system for managing individual accounts for digital products.
  Each product can have multiple accounts (login/password pairs), and stock quantity
  is automatically calculated based on available accounts.

  ## Changes Made

  ### 1. New Tables
  - `product_accounts` - Stores individual account credentials
    - `id` (uuid, primary key)
    - `product_id` (uuid, foreign key to products)
    - `account_login` (text, the login/username)
    - `account_password` (text, the password)
    - `is_sold` (boolean, whether this account has been sold)
    - `order_id` (uuid, nullable, links to order if sold)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on `product_accounts` table
  - Admins can view and manage all accounts for their store's products
  - Customers cannot access account credentials
  - Only authenticated admins can insert/update/delete accounts

  ## Important Notes
  - Stock quantity should be calculated from count of unsold accounts
  - When order is completed, mark accounts as sold and link to order
  - Account credentials are sensitive and should only be visible to admins and buyers
*/

-- Create product_accounts table
CREATE TABLE IF NOT EXISTS product_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  account_login text NOT NULL,
  account_password text NOT NULL,
  is_sold boolean DEFAULT false NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_accounts

-- Admins can view all accounts for their store's products
CREATE POLICY "Admins can view product accounts"
  ON product_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN admins a ON a.store_id = c.store_id
      WHERE p.id = product_accounts.product_id
      AND a.telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    )
  );

-- Admins can insert accounts for their store's products
CREATE POLICY "Admins can insert product accounts"
  ON product_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN admins a ON a.store_id = c.store_id
      WHERE p.id = product_accounts.product_id
      AND a.telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    )
  );

-- Admins can update accounts for their store's products
CREATE POLICY "Admins can update product accounts"
  ON product_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN admins a ON a.store_id = c.store_id
      WHERE p.id = product_accounts.product_id
      AND a.telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN admins a ON a.store_id = c.store_id
      WHERE p.id = product_accounts.product_id
      AND a.telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    )
  );

-- Admins can delete accounts for their store's products
CREATE POLICY "Admins can delete product accounts"
  ON product_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN admins a ON a.store_id = c.store_id
      WHERE p.id = product_accounts.product_id
      AND a.telegram_user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_user_id')::bigint
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_accounts_product_id ON product_accounts(product_id);
CREATE INDEX IF NOT EXISTS idx_product_accounts_is_sold ON product_accounts(product_id, is_sold);
CREATE INDEX IF NOT EXISTS idx_product_accounts_order_id ON product_accounts(order_id);

-- Function to automatically update stock_quantity based on available accounts
CREATE OR REPLACE FUNCTION update_product_stock_from_accounts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_quantity = (
    SELECT COUNT(*) FROM product_accounts
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    AND is_sold = false
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stock quantity when accounts change
DROP TRIGGER IF EXISTS trigger_update_stock_on_account_change ON product_accounts;
CREATE TRIGGER trigger_update_stock_on_account_change
  AFTER INSERT OR UPDATE OR DELETE ON product_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_from_accounts();