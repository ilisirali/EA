
-- Fix 1: Add database CHECK constraints for input validation
ALTER TABLE public.activities ADD CONSTRAINT check_description_length CHECK (length(description) <= 5000);
ALTER TABLE public.activities ADD CONSTRAINT check_location_length CHECK (length(location) <= 200);

-- Fix 2: Restrict storage upload to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;

CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'activity-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
