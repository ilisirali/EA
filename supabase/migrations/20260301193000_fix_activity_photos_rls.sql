-- Fix: Ensure activity_photos RESTRICTIVE policies are correctly dropped and Admins can insert photos
-- Also fix storage bucket policies for admins.

-- 1. Drop existing insert policies for activity_photos
DROP POLICY IF EXISTS "Users can insert photos for their activities" ON public.activity_photos;
DROP POLICY IF EXISTS "activity_photos_insert_policy" ON public.activity_photos;

-- 2. Create the unified INSERT policy for activity_photos
CREATE POLICY "activity_photos_insert_policy" ON public.activity_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_blocked(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.activities
      WHERE activities.id = activity_id
      AND (activities.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- 3. Update STORAGE policy to allow Admins to upload to any folder
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;

CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'activity-photos' AND
  (
    public.is_admin(auth.uid()) OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);
