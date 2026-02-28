-- Allow users to update their own activities
CREATE POLICY "Users can update their own activities"
ON public.activities
FOR UPDATE
USING (user_id = auth.uid());