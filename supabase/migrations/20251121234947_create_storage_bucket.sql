/*
  # Create storage bucket for store assets

  1. New Storage Bucket
    - `store-assets` - Public bucket for storing category images and other store assets
  
  2. Security
    - Public read access for all files
    - Authenticated users can upload files
    - File size limit: 5MB
    - Allowed file types: images only
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-assets',
  'store-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for store assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'store-assets');

CREATE POLICY "Authenticated users can upload store assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Users can update their store assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store-assets');

CREATE POLICY "Users can delete their store assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-assets');
