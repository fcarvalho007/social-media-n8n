-- pdfs: ownership by first folder = auth.uid(); team writers (admin/editor) may manage team files.
DROP POLICY IF EXISTS "Users can delete their own files in pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files in pdfs" ON storage.objects;
CREATE POLICY "pdfs_actualizar_proprio_ou_equipa" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pdfs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.social_pode_escrever()))
  WITH CHECK (bucket_id = 'pdfs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.social_pode_escrever()));
CREATE POLICY "pdfs_apagar_proprio_ou_equipa" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pdfs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.social_pode_escrever()));

-- Public buckets: files stay reachable by public URL (served without RLS); remove anonymous/indiscriminate listing.
DROP POLICY IF EXISTS "Public can read individual files in public buckets" ON storage.objects;
DROP POLICY IF EXISTS "Covers are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public can view AI images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for publications" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their AI images" ON storage.objects;
CREATE POLICY "publicos_ler_proprio_ou_equipa" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('pdfs','post-covers','ai-generated-images','publications')
         AND ((storage.foldername(name))[1] = auth.uid()::text OR public.social_pode_escrever()));