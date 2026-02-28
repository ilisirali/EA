-- Bucket'ı public yap (fotoğrafları görüntüleyebilmek için)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'activity-photos';

-- Public read policy ekle (zaten login olan kullanıcılar için)
CREATE POLICY "Anyone can view activity photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'activity-photos');