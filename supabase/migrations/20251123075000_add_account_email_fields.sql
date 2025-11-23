/*
  # Add Email Fields to Product Accounts

  ## Overview
  This migration adds email and email password fields to the product_accounts table
  to support accounts that include email credentials in addition to login/password.

  ## Changes Made

  ### 1. New Columns in product_accounts
  - `account_email` (text, nullable) - The email address for the account
  - `account_email_password` (text, nullable) - The password for the email account

  ## Important Notes
  - These fields are optional (nullable) as not all accounts require email credentials
  - Email fields should be treated with the same security considerations as login credentials
*/

-- Add email fields to product_accounts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_accounts' AND column_name = 'account_email'
  ) THEN
    ALTER TABLE product_accounts ADD COLUMN account_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_accounts' AND column_name = 'account_email_password'
  ) THEN
    ALTER TABLE product_accounts ADD COLUMN account_email_password text;
  END IF;
END $$;