INSERT INTO storage.buckets (id, name, public) VALUES ('turnaround-files', 'turnaround-files', true);

CREATE POLICY "Authenticated users can upload turnaround files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'turnaround-files');
CREATE POLICY "Authenticated users can update turnaround files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'turnaround-files');
CREATE POLICY "Authenticated users can delete turnaround files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'turnaround-files');
CREATE POLICY "Public can read turnaround files" ON storage.objects FOR SELECT TO public USING (bucket_id = 'turnaround-files');