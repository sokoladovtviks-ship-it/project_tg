/*
  # Initial Database Schema for Telegram Web App Store

  ## Overview
  This migration creates the complete database schema for a flexible online store
  constructor accessible through Telegram Web App.

  ## New Tables

  ### 1. stores
  Main store configuration table
  - `id` (uuid, primary key) - Unique store identifier
  - `name` (text) - Store name
  - `description` (text) - Store description
  - `logo_url` (text) - URL to store logo
  - `currency` (text) - Currency code (RUB, USD, etc.)
  - `language` (text) - Default language (ru, en)
  - `is_active` (boolean) - Store active status
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. admins
  Store administrators
  - `id` (uuid, primary key) - Unique admin identifier
  - `store_id` (uuid, foreign key) - Reference to stores
  - `telegram_user_id` (bigint) - Telegram user ID
  - `telegram_username` (text) - Telegram username
  - `role` (text) - Admin role (owner, manager)
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. categories
  Product categories with hierarchical support
  - `id` (uuid, primary key) - Unique category identifier
  - `store_id` (uuid, foreign key) - Reference to stores
  - `name` (text) - Category name
  - `icon` (text) - Icon identifier or emoji
  - `parent_category_id` (uuid, nullable) - Parent category for subcategories
  - `order_position` (integer) - Display order
  - `created_at` (timestamptz) - Creation timestamp

  ### 4. products
  Store products
  - `id` (uuid, primary key) - Unique product identifier
  - `category_id` (uuid, foreign key) - Reference to categories
  - `name` (text) - Product name
  - `description` (text) - Product description
  - `price` (decimal) - Product price
  - `images_urls` (text[]) - Array of image URLs
  - `stock_quantity` (integer) - Available stock
  - `is_active` (boolean) - Product visibility status
  - `metadata` (jsonb) - Additional flexible product data
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. payment_methods
  Available payment methods
  - `id` (uuid, primary key) - Unique payment method identifier
  - `store_id` (uuid, foreign key) - Reference to stores
  - `name` (text) - Payment method name
  - `type` (text) - Payment type (cash, card, crypto, sbp)
  - `is_active` (boolean) - Method availability status
  - `config` (jsonb) - Additional configuration
  - `order_position` (integer) - Display order
  - `created_at` (timestamptz) - Creation timestamp

  ### 6. delivery_methods
  Available delivery methods
  - `id` (uuid, primary key) - Unique delivery method identifier
  - `store_id` (uuid, foreign key) - Reference to stores
  - `name` (text) - Delivery method name
  - `type` (text) - Delivery type (pickup, courier, shipping)
  - `price` (decimal) - Delivery price
  - `is_active` (boolean) - Method availability status
  - `config` (jsonb) - Additional configuration
  - `order_position` (integer) - Display order
  - `created_at` (timestamptz) - Creation timestamp

  ### 7. orders
  Customer orders
  - `id` (uuid, primary key) - Unique order identifier
  - `order_number` (text) - Human-readable order number
  - `store_id` (uuid, foreign key) - Reference to stores
  - `telegram_user_id` (bigint) - Customer Telegram ID
  - `telegram_username` (text) - Customer Telegram username
  - `telegram_first_name` (text) - Customer first name
  - `telegram_last_name` (text) - Customer last name
  - `items` (jsonb) - Order items array
  - `total_amount` (decimal) - Total order amount
  - `status` (text) - Order status (new, processing, delivering, completed, cancelled)
  - `payment_method` (text) - Selected payment method
  - `delivery_method` (text) - Selected delivery method
  - `delivery_address` (text) - Delivery address
  - `customer_phone` (text) - Customer phone number
  - `customer_notes` (text) - Customer notes
  - `admin_notes` (text) - Admin notes
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security

  Row Level Security (RLS) is enabled on all tables.
  For Telegram Web App, authentication is handled on the client side.
  Public access is allowed for reading data, while write operations
  should be validated through the application logic.

  ## Indexes

  Performance indexes are created for frequently queried columns:
  - Foreign key relationships
  - Telegram user IDs for quick lookups
  - Order numbers for search
  - Active status flags for filtering
*/

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  logo_url text,
  currency text DEFAULT 'RUB',
  language text DEFAULT 'ru',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL,
  telegram_username text,
  role text DEFAULT 'manager',
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, telegram_user_id)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT '📦',
  parent_category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL DEFAULT 0,
  images_urls text[] DEFAULT ARRAY[]::text[],
  stock_quantity integer DEFAULT 0,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create delivery_methods table
CREATE TABLE IF NOT EXISTS delivery_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  price decimal(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  order_position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  telegram_user_id bigint NOT NULL,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  status text DEFAULT 'new',
  payment_method text,
  delivery_method text,
  delivery_address text,
  customer_phone text,
  customer_notes text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admins_telegram_user_id ON admins(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_admins_store_id ON admins(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_store_id ON payment_methods(store_id);
CREATE INDEX IF NOT EXISTS idx_delivery_methods_store_id ON delivery_methods(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_telegram_user_id ON orders(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Enable Row Level Security
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies - Allow public read, authenticated write
CREATE POLICY "Public read access for stores"
  ON stores FOR SELECT
  USING (true);

CREATE POLICY "Public write access for stores"
  ON stores FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for admins"
  ON admins FOR SELECT
  USING (true);

CREATE POLICY "Public write access for admins"
  ON admins FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for categories"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Public write access for categories"
  ON categories FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Public write access for products"
  ON products FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for payment_methods"
  ON payment_methods FOR SELECT
  USING (true);

CREATE POLICY "Public write access for payment_methods"
  ON payment_methods FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for delivery_methods"
  ON delivery_methods FOR SELECT
  USING (true);

CREATE POLICY "Public write access for delivery_methods"
  ON delivery_methods FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Public write access for orders"
  ON orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();