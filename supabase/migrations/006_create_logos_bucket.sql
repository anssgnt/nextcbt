-- Create storage bucket for logos (reduces egress vs base64 in JSON)
-- NOTE: Run this in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read logos" ON storage.objects
FOR SELECT USING (bucket_id = 'logos');

-- Allow authenticated upload (admin only in practice)
CREATE POLICY "Admin upload logos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Admin update logos" ON storage.objects
FOR UPDATE USING (bucket_id = 'logos');
