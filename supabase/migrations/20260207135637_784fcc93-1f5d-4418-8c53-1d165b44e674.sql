-- Add day column to activity_photos to track which day the photo belongs to
ALTER TABLE public.activity_photos 
ADD COLUMN day TEXT NULL;

-- Add index for faster queries
CREATE INDEX idx_activity_photos_day ON public.activity_photos(activity_id, day);