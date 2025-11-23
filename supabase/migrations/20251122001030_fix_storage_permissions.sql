/*
  # Fix storage permissions for anonymous users

  1. Changes
    - Drop existing authenticated-only policies
    - Create new policies that allow anonymous (anon) users to upload, update, and delete files
    - This is needed because the app doesn't use authentication
  
  2. Security
    - Public read access remains unchanged
    - Allow anon role to perform all operations on store-assets bucket
*/

DROP POLICY IF EXISTS "Authenticated users can upload store assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their store assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their store assets" ON storage.objects;

CREATE POLICY "Anyone can upload store assets"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Anyone can update store assets"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'store-assets');

CREATE POLICY "Anyone can delete store assets"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'store-assets');
