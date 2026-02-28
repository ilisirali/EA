-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- PROFILES TABLE
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

-- Recreate PERMISSIVE policies for profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

-- USER_ROLES TABLE
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;

-- Recreate PERMISSIVE policies for user_roles
CREATE POLICY "user_roles_select_policy" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_insert_policy" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_update_policy" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_delete_policy" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ACTIVITIES TABLE
DROP POLICY IF EXISTS "Users can view own activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can view all activities" ON public.activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can manage all activities" ON public.activities;
DROP POLICY IF EXISTS "activities_select_own" ON public.activities;
DROP POLICY IF EXISTS "activities_select_admin" ON public.activities;
DROP POLICY IF EXISTS "activities_insert_own" ON public.activities;
DROP POLICY IF EXISTS "activities_update_own" ON public.activities;
DROP POLICY IF EXISTS "activities_update_admin" ON public.activities;
DROP POLICY IF EXISTS "activities_delete_own" ON public.activities;
DROP POLICY IF EXISTS "activities_delete_admin" ON public.activities;

-- Recreate PERMISSIVE policies for activities
CREATE POLICY "activities_select_policy" ON public.activities
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "activities_insert_policy" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activities_update_policy" ON public.activities
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "activities_delete_policy" ON public.activities
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ACTIVITY_PHOTOS TABLE
DROP POLICY IF EXISTS "Users can view own activity photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Admins can view all activity photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Users can insert own activity photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Users can delete own activity photos" ON public.activity_photos;
DROP POLICY IF EXISTS "activity_photos_select_own" ON public.activity_photos;
DROP POLICY IF EXISTS "activity_photos_select_admin" ON public.activity_photos;
DROP POLICY IF EXISTS "activity_photos_insert_own" ON public.activity_photos;
DROP POLICY IF EXISTS "activity_photos_delete_own" ON public.activity_photos;
DROP POLICY IF EXISTS "activity_photos_delete_admin" ON public.activity_photos;

-- Recreate PERMISSIVE policies for activity_photos
CREATE POLICY "activity_photos_select_policy" ON public.activity_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activities 
      WHERE activities.id = activity_photos.activity_id 
      AND (activities.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "activity_photos_insert_policy" ON public.activity_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activities 
      WHERE activities.id = activity_photos.activity_id 
      AND activities.user_id = auth.uid()
    )
  );

CREATE POLICY "activity_photos_delete_policy" ON public.activity_photos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activities 
      WHERE activities.id = activity_photos.activity_id 
      AND (activities.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );