-- Admin users can update any activity (not just their own)
DROP POLICY IF EXISTS "Admin can update all activities" ON activities;
CREATE POLICY "Admin can update all activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Admin users can delete any activity (not just their own)
DROP POLICY IF EXISTS "Admin can delete all activities" ON activities;
CREATE POLICY "Admin can delete all activities"
  ON activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Admin users can manage all photos
DROP POLICY IF EXISTS "Admin can delete all photos" ON activity_photos;
CREATE POLICY "Admin can delete all photos"
  ON activity_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admin can insert photos for any activity" ON activity_photos;
CREATE POLICY "Admin can insert photos for any activity"
  ON activity_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );
