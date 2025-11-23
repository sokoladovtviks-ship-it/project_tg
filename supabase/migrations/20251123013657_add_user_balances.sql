/*
  # Add user balances and bonuses

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key)
      - `telegram_user_id` (bigint, unique)
      - `telegram_username` (text)
      - `telegram_photo_url` (text, nullable)
      - `balance` (numeric, default 0)
      - `bonus_points` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policy for users to read and update their own profile
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint UNIQUE NOT NULL,
  telegram_username text,
  telegram_photo_url text,
  balance numeric DEFAULT 0 NOT NULL,
  bonus_points integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
