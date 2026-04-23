import { Instagram, Linkedin, Youtube, Facebook, MapPin, FileText, type LucideIcon } from 'lucide-react';
import { PostFormat, getNetworkFromFormat, getFormatConfig } from '@/types/social';
import InstagramCarouselPreview from '@/components/manual-post/InstagramCarouselPreview';
import InstagramStoryPreview from '@/components/manual-post/InstagramStoryPreview';
import InstagramReelPreview from '@/components/manual-post/InstagramReelPreview';
import LinkedInPreview from '@/components/manual-post/LinkedInPreview';
import LinkedInDocumentPreview from '@/components/manual-post/LinkedInDocumentPreview';
import YouTubeShortsPreview from '@/components/manual-post/YouTubeShortsPreview';
import YouTubeVideoPreview from '@/components/manual-post/YouTubeVideoPreview';
import TikTokPreview from '@/components/manual-post/TikTokPreview';
import FacebookPreview from '@/components/manual-post/FacebookPreview';
import GoogleBusinessPreview from '@/components/manual-post/GoogleBusinessPreview';

export interface PreviewRendererContext {
  caption: string;
  mediaFiles: File[];
  mediaPreviewUrls: string[];
  mediaItems: Array<{ url: string; isVideo: boolean }>;
}

/**
 * Renders the social network preview for a given post format.
 * Extracted from ManualCreate.tsx (Phase 4) — pure presentation, no side-effects.
 */
export function renderFormatPreview(format: PostFormat, ctx: PreviewRendererContext) {
  const { caption, mediaFiles, mediaPreviewUrls, mediaItems } = ctx;
  const network = getNetworkFromFormat(format);

  if (network === 'instagram') {
    if (format === 'instagram_stories') {
      return <InstagramStoryPreview mediaUrl={mediaPreviewUrls[0]} aspectRatioValid={true} />;
    }
    if (format === 'instagram_reel') {
      return <InstagramReelPreview mediaUrl={mediaPreviewUrls[0]} caption={caption} />;
    }
    return <InstagramCarouselPreview mediaItems={mediaItems} caption={caption} />;
  }

  if (network === 'linkedin') {
    if (format === 'linkedin_document') {
      return <LinkedInDocumentPreview mediaUrls={mediaPreviewUrls} mediaFiles={mediaFiles} caption={caption} />;
    }
    return <LinkedInPreview mediaUrls={mediaPreviewUrls} caption={caption} />;
  }

  if (network === 'youtube') {
    if (format === 'youtube_shorts') {
      return <YouTubeShortsPreview mediaUrl={mediaPreviewUrls[0]} caption={caption} />;
    }
    return <YouTubeVideoPreview mediaUrl={mediaPreviewUrls[0]} caption={caption} />;
  }

  if (network === 'tiktok') {
    return <TikTokPreview mediaUrl={mediaPreviewUrls[0]} caption={caption} />;
  }

  if (network === 'facebook') {
    return (
      <FacebookPreview
        mediaUrls={mediaPreviewUrls}
        caption={caption}
        format={format as 'facebook_image' | 'facebook_stories' | 'facebook_reel'}
      />
    );
  }

  if (network === 'googlebusiness') {
    return (
      <GoogleBusinessPreview
        mediaUrls={mediaPreviewUrls}
        caption={caption}
        format={format as 'googlebusiness_post' | 'googlebusiness_media'}
      />
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/30">
      <p className="text-sm text-muted-foreground mb-2">Pré-visualização: {getFormatConfig(format)?.label}</p>
      {mediaPreviewUrls.length > 0 && (
        <img src={mediaPreviewUrls[0]} alt="Preview" className="rounded-lg max-h-64 mx-auto" />
      )}
      {caption && <p className="mt-3 text-sm whitespace-pre-wrap">{caption}</p>}
    </div>
  );
}

/** Maps a network identifier to its lucide icon component. */
export function getNetworkIcon(network: string): LucideIcon {
  switch (network) {
    case 'instagram':
      return Instagram;
    case 'linkedin':
      return Linkedin;
    case 'youtube':
      return Youtube;
    case 'facebook':
      return Facebook;
    case 'googlebusiness':
      return MapPin;
    default:
      return FileText;
  }
}
