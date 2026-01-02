-- Allow public read access to instagram_analytics for pre-loading on public URL
CREATE POLICY "Allow public read access to instagram_analytics"
ON public.instagram_analytics
FOR SELECT
USING (true);