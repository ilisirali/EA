-- Revoke all access from anon role on sensitive tables
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.activities FROM anon;
REVOKE ALL ON public.activity_photos FROM anon;
REVOKE ALL ON public.user_roles FROM anon;