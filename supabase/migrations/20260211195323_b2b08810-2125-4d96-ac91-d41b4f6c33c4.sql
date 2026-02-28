
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all direct access"
ON public.email_verifications
FOR ALL
USING (false)
WITH CHECK (false);
