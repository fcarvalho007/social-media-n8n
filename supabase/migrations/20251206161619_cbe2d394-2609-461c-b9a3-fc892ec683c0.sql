-- Make the pdfs bucket public so Getlate API can access media URLs
UPDATE storage.buckets SET public = true WHERE name = 'pdfs';

-- Policy for SELECT (view own files)
CREATE POLICY "Users can view their own files in pdfs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs');

-- Policy for INSERT (upload files)
CREATE POLICY "Users can upload files to pdfs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdfs');

-- Policy for UPDATE (update own files)
CREATE POLICY "Users can update their own files in pdfs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'pdfs');

-- Policy for DELETE (delete own files)
CREATE POLICY "Users can delete their own files in pdfs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'pdfs');