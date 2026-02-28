-- Fix: Restrict storage access to owner or admin (replace overly permissive policy)
DROP POLICY IF EXISTS "Authenticated users can view activity photos" ON storage.objects;

CREATE POLICY "Users can view their own photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'activity-photos' AND
  (
    public.is_admin(auth.uid()) OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);