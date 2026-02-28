-- First, drop ALL existing policies on all tables and recreate with proper auth checks

-- PROFILES TABLE - Drop all policies
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- USER_ROLES TABLE - Drop all policies
DROP POLICY IF EXISTS "Authenticated users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- ACTIVITIES TABLE - Drop all policies
DROP POLICY IF EXISTS "Authenticated users can view own activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can insert own activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can update own activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can delete activities" ON public.activities;
DROP POLICY IF EXISTS "Users can view their own activities" ON public.activities;
DROP POLICY IF EXISTS "Staff can insert their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can view all activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can delete any activity" ON public.activities;
DROP POLICY IF EXISTS "Admins can update any activity" ON public.activities;

-- ACTIVITY_PHOTOS TABLE - Drop all policies
DROP POLICY IF EXISTS "Authenticated users can view own activity photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Authenticated users can insert own activity photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Authenticated users can delete own activity photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Users can view photos of their activities" ON public.activity_photos;
DROP POLICY IF EXISTS "Users can insert photos for their activities" ON public.activity_photos;
DROP POLICY IF EXISTS "Admins can view all photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Admins can delete any photo" ON public.activity_photos;

-- Now create new PERMISSIVE policies (default) with proper auth checks

-- PROFILES TABLE - New policies
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- USER_ROLES TABLE - New policies
CREATE POLICY "Users can view own roles" 
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- ACTIVITIES TABLE - New policies
CREATE POLICY "Users can view own activities" 
ON public.activities FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activities" 
ON public.activities FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own activities" 
ON public.activities FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities" 
ON public.activities FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any activity" 
ON public.activities FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete any activity" 
ON public.activities FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- ACTIVITY_PHOTOS TABLE - New policies
CREATE POLICY "Users can view own activity photos" 
ON public.activity_photos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.activities 
    WHERE activities.id = activity_photos.activity_id 
    AND activities.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all photos" 
ON public.activity_photos FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own activity photos" 
ON public.activity_photos FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.activities 
    WHERE activities.id = activity_photos.activity_id 
    AND activities.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own activity photos" 
ON public.activity_photos FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.activities 
    WHERE activities.id = activity_photos.activity_id 
    AND activities.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can delete any photo" 
ON public.activity_photos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));