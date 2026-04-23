ALTER TABLE public.posts_drafts
DROP CONSTRAINT IF EXISTS posts_drafts_platform_check;

ALTER TABLE public.posts_drafts
ADD CONSTRAINT posts_drafts_platform_check
CHECK (
  platform IN (
    'instagram_carrousel',
    'instagram_carousel',
    'instagram_image',
    'instagram_stories',
    'instagram_reel',
    'linkedin',
    'linkedin_post',
    'linkedin_document',
    'youtube_shorts',
    'youtube_video',
    'tiktok_video',
    'facebook_image',
    'facebook_stories',
    'facebook_reel',
    'googlebusiness_post'
  )
);