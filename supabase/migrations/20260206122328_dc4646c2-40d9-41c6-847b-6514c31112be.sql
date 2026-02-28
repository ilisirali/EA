-- Fix security issues: Block anonymous access to all tables

-- 1. Drop existing policies and create new ones with auth.uid() IS NOT NULL checks

-- PROFILES TABLE
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Authenticated users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Authenticated users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

-- USER_ROLES TABLE
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Authenticated users can view own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ACTIVITIES TABLE
DROP POLICY IF EXISTS "Users can view own activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can view all activities" ON public.activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update own activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can delete any activity" ON public.activities;

CREATE POLICY "Authenticated users can view own activities" 
ON public.activities FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY "Authenticated users can insert own activities" 
ON public.activities FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own activities" 
ON public.activities FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY "Admins can delete activities" 
ON public.activities FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ACTIVITY_PHOTOS TABLE
DROP POLICY IF EXISTS "Users can view own activity photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Users can insert own activity photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Users can delete own activity photos" ON public.activity_photos;

CREATE POLICY "Authenticated users can view own activity photos" 
ON public.activity_photos FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.activities 
    WHERE activities.id = activity_photos.activity_id 
    AND (
      activities.user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    )
  )
);

CREATE POLICY "Authenticated users can insert own activity photos" 
ON public.activity_photos FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.activities 
    WHERE activities.id = activity_photos.activity_id 
    AND activities.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can delete own activity photos" 
ON public.activity_photos FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.activities 
    WHERE activities.id = activity_photos.activity_id 
    AND activities.user_id = auth.uid()
  )
);