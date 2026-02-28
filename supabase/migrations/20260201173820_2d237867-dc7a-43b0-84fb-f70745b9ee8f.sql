-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activities table
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_photos table (stores URLs, not base64)
CREATE TABLE public.activity_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_photos ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_admin(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- RLS Policies for activities
CREATE POLICY "Staff can insert their own activities"
ON public.activities FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own activities"
ON public.activities FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activities"
ON public.activities FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update any activity"
ON public.activities FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete any activity"
ON public.activities FOR DELETE
USING (public.is_admin(auth.uid()));

-- RLS Policies for activity_photos
CREATE POLICY "Users can insert photos for their activities"
ON public.activity_photos FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.activities 
  WHERE id = activity_id AND user_id = auth.uid()
));

CREATE POLICY "Users can view photos of their activities"
ON public.activity_photos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.activities 
  WHERE id = activity_id AND user_id = auth.uid()
));

CREATE POLICY "Admins can view all photos"
ON public.activity_photos FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete any photo"
ON public.activity_photos FOR DELETE
USING (public.is_admin(auth.uid()));

-- Trigger function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- Default role is staff
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for activity photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('activity-photos', 'activity-photos', false);

-- Storage policies for activity photos bucket
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'activity-photos');

CREATE POLICY "Users can view photos of their activities"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'activity-photos' AND
  (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.activity_photos ap
      JOIN public.activities a ON ap.activity_id = a.id
      WHERE ap.file_url LIKE '%' || name AND a.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can delete any photo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'activity-photos' AND public.is_admin(auth.uid()));