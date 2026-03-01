/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useLanguage } from './useLanguage';
import { compressImage } from '@/lib/imageCompression';

export interface ActivityPhoto {
  id: string;
  file_url: string;
  day: string | null;
}

export interface Activity {
  id: string;
  user_id: string;
  description: string;
  location: string | null;
  activity_date: string;
  created_at: string;
  photos: ActivityPhoto[];
  profile?: {
    full_name: string | null;
    email: string;
  };
}

function sanitizeFileName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '').substring(0, 200);
  return `${base}.${ext}`;
}

export function useActivities(filterUserId?: string | null) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const fetchActivities = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Build query - RLS will handle filtering based on role
      let query = supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      // Admin can filter by specific user
      if (isAdmin && filterUserId) {
        query = query.eq('user_id', filterUserId);
      }

      const { data: activitiesData, error: activitiesError } = await query;

      if (activitiesError) throw activitiesError;

      // Fetch ALL photos in one query instead of per-activity
      const activityIds = (activitiesData || []).map(a => a.id);
      const { data: allPhotosData } = activityIds.length > 0
        ? await supabase
          .from('activity_photos')
          .select('id, file_url, day, activity_id')
          .in('activity_id', activityIds)
        : { data: [] };

      // Batch generate signed URLs for all photos at once
      const pathPhotos = (allPhotosData || []).filter(p => !p.file_url.startsWith('http'));
      const paths = pathPhotos.map(p => p.file_url);

      const signedUrlMap: Record<string, string> = {};
      if (paths.length > 0) {
        // createSignedUrls supports batch - one request for all photos
        const { data: signedUrls } = await supabase.storage
          .from('activity-photos')
          .createSignedUrls(paths, 3600);
        if (signedUrls) {
          signedUrls.forEach((item) => {
            if (item.signedUrl && item.path) {
              signedUrlMap[item.path] = item.signedUrl;
            }
          });
        }
      }

      // Group photos by activity_id
      const photosByActivity: Record<string, ActivityPhoto[]> = {};
      for (const p of (allPhotosData || [])) {
        const isPath = !p.file_url.startsWith('http');
        const url = isPath ? (signedUrlMap[p.file_url] || p.file_url) : p.file_url;
        if (!photosByActivity[p.activity_id]) photosByActivity[p.activity_id] = [];
        photosByActivity[p.activity_id].push({ id: p.id, file_url: url, day: p.day });
      }

      // If admin, fetch ALL profiles in one query
      const profileMap: Record<string, { full_name: string | null; email: string } | undefined> = {};
      if (isAdmin) {
        const userIds = [...new Set((activitiesData || []).map(a => a.user_id))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
          for (const p of (profilesData || [])) {
            profileMap[p.id] = { full_name: p.full_name, email: p.email };
          }
        }
      }

      const activitiesWithPhotos = (activitiesData || []).map((activity) => ({
        ...activity,
        photos: photosByActivity[activity.id] || [],
        profile: isAdmin ? profileMap[activity.user_id] : undefined,
      }));

      setActivities(activitiesWithPhotos);
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async (data: {
    description: string;
    location: string;
    date: Date;
    photos: File[];
    dayPhotos?: { day: string; photos: File[] }[];
  }) => {
    if (!user) return;

    try {
      // Validate inputs
      const description = data.description?.trim() || '';
      const location = data.location?.trim() || null;
      if (!description || description.length > 5000) {
        throw new Error('Description must be between 1 and 5000 characters');
      }
      if (location && location.length > 200) {
        throw new Error('Location must be under 200 characters');
      }

      // Insert activity
      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          description,
          location,
          activity_date: data.date.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (activityError) throw activityError;

      // Upload photos with day info
      if (data.dayPhotos && data.dayPhotos.length > 0) {
        // Weekly form with per-day photos
        for (const dayEntry of data.dayPhotos) {
          for (const photo of dayEntry.photos) {
            const compressedPhoto = await compressImage(photo);
            const fileName = `${user.id}/${activity.id}/${Date.now()}-${sanitizeFileName(compressedPhoto.name)}`;

            const { error: uploadError } = await supabase.storage
              .from('activity-photos')
              .upload(fileName, compressedPhoto);

            if (uploadError) throw uploadError;

            // Save file path reference (not signed URL)
            await supabase.from('activity_photos').insert({
              activity_id: activity.id,
              file_url: fileName,
              day: dayEntry.day,
            });
          }
        }
      } else {
        // Simple form without day info
        for (const photo of data.photos) {
          const compressedPhoto = await compressImage(photo);
          const fileName = `${user.id}/${activity.id}/${Date.now()}-${sanitizeFileName(compressedPhoto.name)}`;

          const { error: uploadError } = await supabase.storage
            .from('activity-photos')
            .upload(fileName, compressedPhoto);

          if (uploadError) throw uploadError;

          // Save file path reference (not signed URL)
          await supabase.from('activity_photos').insert({
            activity_id: activity.id,
            file_url: fileName,
          });
        }
      }

      await fetchActivities();

      toast({
        title: t("activity.saved"),
        description: t("activity.saved"),
      });

      return activity;
    } catch (error: any) {
      console.error("Activity submission error:", error);
      toast({
        title: t("auth.error"),
        description: error.message + (error.details ? ` (${error.details})` : "") + (error.hint ? ` - Hint: ${error.hint}` : ""),
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateActivity = async (id: string, data: {
    description: string;
    location?: string;
    date?: Date;
  }) => {
    try {
      const description = data.description?.trim() || '';
      const location = data.location?.trim() || null;
      if (!description || description.length > 5000) {
        throw new Error('Description must be between 1 and 5000 characters');
      }
      if (location && location.length > 200) {
        throw new Error('Location must be under 200 characters');
      }

      const updatePayload: any = {
        description,
        location,
      };

      if (data.date) {
        updatePayload.activity_date = data.date.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('activities')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      await fetchActivities();

      toast({
        title: t("edit.success"),
        description: t("edit.success"),
      });

      return true;
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setActivities(prev => prev.filter(a => a.id !== id));

      toast({
        title: t("adminPanel.userDeleted"),
        description: t("adminPanel.userDeleted"),
      });
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deletePhoto = async (photoId: string) => {
    try {
      const { error } = await supabase
        .from('activity_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const uploadPhotosForActivity = async (activityId: string, photos: File[], day?: string) => {
    if (!user) return false;
    try {
      const activity = activities.find(a => a.id === activityId);
      const targetUserId = activity ? activity.user_id : user.id;

      for (const photo of photos) {
        const compressedPhoto = await compressImage(photo);
        const fileName = `${targetUserId}/${activityId}/${Date.now()}-${sanitizeFileName(compressedPhoto.name)}`;

        const { error: uploadError } = await supabase.storage
          .from('activity-photos')
          .upload(fileName, compressedPhoto);

        if (uploadError) throw uploadError;

        // Save file path reference (not signed URL)
        await supabase.from('activity_photos').insert({
          activity_id: activityId,
          file_url: fileName,
          day: day || null,
        });
      }
      return true;
    } catch (error: any) {
      toast({
        title: t("auth.error"),
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, filterUserId]);

  return {
    activities,
    loading,
    addActivity,
    updateActivity,
    deleteActivity,
    deletePhoto,
    uploadPhotosForActivity,
    refetch: fetchActivities,
  };
}
