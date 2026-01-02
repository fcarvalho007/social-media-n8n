-- Fix engagement_rate column to handle larger values (likes + comments can exceed 9999)
ALTER TABLE public.instagram_analytics 
ALTER COLUMN engagement_rate TYPE numeric(14,4);