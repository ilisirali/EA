-- Drop public access policy for activity-photos
DROP POLICY IF EXISTS "Anyone can view activity photos" ON storage.objects;

-- Make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'activity-photos';

-- Ensure authenticated users can still access their own photos
DROP POLICY IF EXISTS "Authenticated users can view activity photos" ON storage.objects;
CREATE POLICY "Authenticated users can view activity photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'activity-photos');