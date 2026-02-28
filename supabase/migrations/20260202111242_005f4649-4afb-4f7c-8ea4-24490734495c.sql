-- Mevcut SELECT politikalarını sil
DROP POLICY IF EXISTS "Users can view their own activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can view all activities" ON public.activities;

-- Yeni PERMISSIVE politikalar oluştur (OR mantığı için)
CREATE POLICY "Users can view their own activities" 
ON public.activities 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activities" 
ON public.activities 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

-- Aynısını activity_photos için de yap
DROP POLICY IF EXISTS "Users can view photos of their activities" ON public.activity_photos;
DROP POLICY IF EXISTS "Admins can view all photos" ON public.activity_photos;

CREATE POLICY "Users can view photos of their activities" 
ON public.activity_photos 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM activities 
  WHERE activities.id = activity_photos.activity_id 
  AND activities.user_id = auth.uid()
));

CREATE POLICY "Admins can view all photos" 
ON public.activity_photos 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));