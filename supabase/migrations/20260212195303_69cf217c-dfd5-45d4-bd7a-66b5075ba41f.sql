
-- =============================================
-- FIX 1: Prevent users from unblocking themselves
-- =============================================

-- Trigger to prevent non-admins from changing is_blocked
CREATE OR REPLACE FUNCTION public.prevent_self_unblock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked 
     AND auth.uid() = NEW.id 
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Users cannot modify their blocked status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER block_self_unblock
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_unblock();

-- =============================================
-- FIX 2: Block blocked users at RLS level
-- =============================================

-- Helper function to check if current user is blocked
CREATE OR REPLACE FUNCTION public.is_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND is_blocked = true
  )
$$;

-- Activities: update SELECT policy
DROP POLICY IF EXISTS "activities_select_policy" ON public.activities;
CREATE POLICY "activities_select_policy" ON public.activities
  FOR SELECT TO authenticated
  USING (
    NOT public.is_blocked(auth.uid()) AND
    (auth.uid() = user_id OR public.is_admin(auth.uid()))
  );

-- Activities: update INSERT policy
DROP POLICY IF EXISTS "activities_insert_policy" ON public.activities;
CREATE POLICY "activities_insert_policy" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_blocked(auth.uid()) AND
    auth.uid() = user_id
  );

-- Activities: update UPDATE policy
DROP POLICY IF EXISTS "activities_update_policy" ON public.activities;
CREATE POLICY "activities_update_policy" ON public.activities
  FOR UPDATE TO authenticated
  USING (
    NOT public.is_blocked(auth.uid()) AND
    (auth.uid() = user_id OR public.is_admin(auth.uid()))
  )
  WITH CHECK (
    NOT public.is_blocked(auth.uid()) AND
    (auth.uid() = user_id OR public.is_admin(auth.uid()))
  );

-- Activities: update DELETE policy
DROP POLICY IF EXISTS "activities_delete_policy" ON public.activities;
CREATE POLICY "activities_delete_policy" ON public.activities
  FOR DELETE TO authenticated
  USING (
    NOT public.is_blocked(auth.uid()) AND
    (auth.uid() = user_id OR public.is_admin(auth.uid()))
  );

-- Activity photos: update SELECT policy
DROP POLICY IF EXISTS "activity_photos_select_policy" ON public.activity_photos;
CREATE POLICY "activity_photos_select_policy" ON public.activity_photos
  FOR SELECT TO authenticated
  USING (
    NOT public.is_blocked(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_photos.activity_id
      AND (activities.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Activity photos: update INSERT policy
DROP POLICY IF EXISTS "activity_photos_insert_policy" ON public.activity_photos;
CREATE POLICY "activity_photos_insert_policy" ON public.activity_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_blocked(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_photos.activity_id
      AND activities.user_id = auth.uid()
    )
  );

-- Activity photos: update DELETE policy
DROP POLICY IF EXISTS "activity_photos_delete_policy" ON public.activity_photos;
CREATE POLICY "activity_photos_delete_policy" ON public.activity_photos
  FOR DELETE TO authenticated
  USING (
    NOT public.is_blocked(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_photos.activity_id
      AND (activities.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Keep admin-only policies unchanged (admins can't be blocked by design)
