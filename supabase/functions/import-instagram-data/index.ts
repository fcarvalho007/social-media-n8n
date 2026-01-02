import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InstagramPost {
  url?: string;
  shortCode?: string;
  type?: string;
  caption?: string;
  hashtags?: string[];
  likesCount?: number;
  commentsCount?: number;
  videoViewCount?: number;
  displayUrl?: string;
  images?: string[];
  childPosts?: { displayUrl?: string; shortCode?: string }[];
  timestamp?: string;
  locationName?: string;
  ownerUsername?: string;
  ownerFullName?: string;
  followersCount?: number;
  isSponsored?: boolean;
  dimensionsWidth?: number;
  dimensionsHeight?: number;
  isVideo?: boolean;
  videoDuration?: number;
}

// Delay helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Download image with retry logic and fallback URLs
async function downloadWithRetry(
  urls: string[],
  maxRetries = 3
): Promise<{ blob: Blob; contentType: string } | null> {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];

  for (const url of urls) {
    if (!url || url.includes("supabase")) continue;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Downloading image (attempt ${attempt}/${maxRetries}): ${url.substring(0, 80)}...`);
        
        const response = await fetch(url, {
          headers: {
            "User-Agent": userAgents[attempt - 1] || userAgents[0],
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          const contentType = response.headers.get("content-type") || "image/jpeg";
          console.log(`Successfully downloaded image (${Math.round(blob.size / 1024)}KB)`);
          return { blob, contentType };
        }
        
        console.warn(`Download failed (${response.status}), retrying...`);
        await delay(1000 * attempt); // Exponential backoff: 1s, 2s, 3s
      } catch (error) {
        console.warn(`Download error on attempt ${attempt}:`, error);
        await delay(1000 * attempt);
      }
    }
  }

  console.warn("All download attempts failed for all URLs");
  return null;
}

// Download image and upload to Supabase Storage with retry
async function downloadAndUploadImage(
  supabase: any,
  post: InstagramPost,
  userId: string
): Promise<string | null> {
  const shortcode = post.shortCode || "unknown";
  
  // Build list of URLs to try (priority order)
  const urlsToTry: string[] = [];
  
  // 1. Primary displayUrl
  if (post.displayUrl) {
    urlsToTry.push(post.displayUrl);
  }
  
  // 2. Images array
  if (post.images && Array.isArray(post.images)) {
    urlsToTry.push(...post.images.filter(Boolean));
  }
  
  // 3. Child posts (for carousels)
  if (post.childPosts && Array.isArray(post.childPosts)) {
    for (const child of post.childPosts) {
      if (child.displayUrl) {
        urlsToTry.push(child.displayUrl);
      }
    }
  }

  if (urlsToTry.length === 0) {
    console.warn(`No image URLs available for post ${shortcode}`);
    return null;
  }

  // Check if already in Supabase
  const existingUrl = urlsToTry.find(url => url.includes("supabase") && url.includes("storage"));
  if (existingUrl) {
    console.log(`Image already in storage: ${shortcode}`);
    return existingUrl;
  }

  try {
    const result = await downloadWithRetry(urlsToTry);
    if (!result) {
      return post.displayUrl || urlsToTry[0] || null; // Return original URL as fallback
    }

    const { blob, contentType } = result;
    const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const fileName = `analytics/${userId}/${shortcode}.${extension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("publications")
      .upload(fileName, blob, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.warn(`Upload failed for ${shortcode}:`, uploadError.message);
      return post.displayUrl || null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("publications")
      .getPublicUrl(fileName);

    console.log(`Successfully stored image for ${shortcode}: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error(`Error processing image for ${shortcode}:`, error);
    return post.displayUrl || null;
  }
}

// Collect media URLs (for carousels) without downloading all of them (too slow for large imports)
function collectMediaUrls(post: InstagramPost): string[] {
  const urls: string[] = [];

  const push = (u?: string) => {
    if (!u) return;
    if (!urls.includes(u)) urls.push(u);
  };

  push(post.displayUrl);

  if (post.childPosts && Array.isArray(post.childPosts)) {
    for (const child of post.childPosts) push(child.displayUrl);
  }

  if (post.images && Array.isArray(post.images)) {
    for (const u of post.images) push(u);
  }

  // keep it bounded
  return urls.slice(0, 10);
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Client for user auth
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for storage operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { posts, alsoImportToMediaLibrary = false } = await req.json() as { 
      posts: InstagramPost[];
      alsoImportToMediaLibrary?: boolean;
    };

    if (!posts || !Array.isArray(posts)) {
      return new Response(JSON.stringify({ error: "Invalid posts data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${posts.length} Instagram posts for user ${user.id}`);

    // Check for existing posts to detect duplicates
    const shortcodes = posts.map((p) => p.shortCode).filter(Boolean);
    const existingShortcodes = new Set<string>();

    if (shortcodes.length > 0) {
      const { data: existingPosts, error: existingError } = await supabaseClient
        .from("instagram_analytics")
        .select("shortcode")
        .eq("user_id", user.id)
        .in("shortcode", shortcodes);

      if (existingError) {
        console.warn("Duplicate check warning:", existingError.message);
      }

      for (const p of existingPosts || []) {
        if (p.shortcode) existingShortcodes.add(p.shortcode);
      }
    }


    const duplicateCount = posts.filter((p) => p.shortCode && existingShortcodes.has(p.shortCode)).length;


    // Transform posts to database format (insert in small batches to avoid timeouts)
    const BATCH_SIZE = 10;
    const analyticsData: any[] = [];
    const mediaLibraryQueue: any[] = [];
    let insertedCount = 0;
    let imagesStored = 0;
    let imagesFailed = 0;

    const flushBatch = async () => {
      if (analyticsData.length === 0) return;

      const { data: insertedData, error: insertError } = await supabaseClient
        .from("instagram_analytics")
        .insert(analyticsData)
        .select("id");

      if (insertError) {
        console.error("Error inserting analytics batch:", insertError);
        throw insertError;
      }

      insertedCount += insertedData?.length || 0;
      console.log(`Inserted batch: ${insertedData?.length || 0} (total ${insertedCount})`);
      analyticsData.length = 0;
    };

    for (const post of posts) {
      // Skip if already exists (duplicate)
      if (post.shortCode && existingShortcodes.has(post.shortCode)) {
        continue;
      }

      // Extract hashtags from caption if not provided
      let hashtags = post.hashtags || [];
      if (hashtags.length === 0 && post.caption) {
        const hashtagMatches = post.caption.match(/#\w+/g);
        if (hashtagMatches) {
          hashtags = hashtagMatches.map((h) => h.toLowerCase());
        }
      }

      // Store thumbnail image permanently (this is the critical part for the UI)
      const storedThumbnailUrl = await downloadAndUploadImage(supabaseAdmin, post, user.id);
      if (storedThumbnailUrl?.includes("supabase")) {
        imagesStored++;
      } else if (post.displayUrl) {
        imagesFailed++;
      }

      // Keep media_urls lightweight: include thumbnail + original URLs (without downloading all)
      const collected = collectMediaUrls(post);
      const media_urls = Array.from(
        new Set([storedThumbnailUrl, ...collected].filter(Boolean) as string[])
      ).slice(0, 10);

      // Safe date parsing (avoid invalid date crashing the whole import)
      let postedAtIso: string | null = null;
      if (post.timestamp) {
        const d = new Date(post.timestamp);
        postedAtIso = Number.isFinite(d.getTime()) ? d.toISOString() : null;
      }

      // Calculate engagement rate (likes+comments)
      const totalEngagement = (post.likesCount || 0) + (post.commentsCount || 0);

      // Normalize post type
      const normalizePostType = (type: string | undefined): string => {
        if (!type) return post.isVideo ? "Video" : "Image";
        const lower = type.toLowerCase();
        if (lower === "sidecar" || lower === "carousel" || lower === "album") return "Carrossel";
        if (lower === "video" || lower === "reel") return "Video";
        if (lower === "image" || lower === "photo") return "Image";
        return type;
      };

      // Normalize username (remove @, lowercase, trim)
      const normalizeUsername = (username: string | undefined): string | null => {
        if (!username) return null;
        return username.replace(/^@/, "").toLowerCase().trim();
      };

      const ownerUsername = normalizeUsername(post.ownerUsername);

      const row = {
        user_id: user.id,
        post_url: post.url || `https://instagram.com/p/${post.shortCode}`,
        shortcode: post.shortCode,
        post_type: normalizePostType(post.type),
        caption: post.caption,
        hashtags,
        likes_count: post.likesCount || 0,
        comments_count: post.commentsCount || 0,
        views_count: post.videoViewCount || 0,
        engagement_rate: totalEngagement,
        media_urls: media_urls.length > 0 ? media_urls : [post.displayUrl].filter(Boolean),
        thumbnail_url: storedThumbnailUrl || post.displayUrl,
        posted_at: postedAtIso,
        location_name: post.locationName,
        owner_username: ownerUsername,
        dimensions_width: post.dimensionsWidth,
        dimensions_height: post.dimensionsHeight,
        is_video: post.isVideo || post.type === "Video" || post.type === "Reel",
        video_duration: post.videoDuration,
      };

      analyticsData.push(row);

      if (alsoImportToMediaLibrary && row.thumbnail_url) {
        mediaLibraryQueue.push({
          user_id: user.id,
          file_url: row.thumbnail_url,
          file_name: `instagram-${row.shortcode || row.post_url.split("/").pop()}.jpg`,
          file_type: row.is_video ? "video/mp4" : "image/jpeg",
          source: "instagram_import",
          tags: row.hashtags?.slice(0, 5) || [],
        });
      }

      if (analyticsData.length >= BATCH_SIZE) {
        await flushBatch();
      }
    }

    // flush remaining
    await flushBatch();

    // Optionally import thumbnails to media library
    let mediaImportedCount = 0;
    if (alsoImportToMediaLibrary && mediaLibraryQueue.length > 0) {
      const { error: mediaError } = await supabaseClient
        .from("media_library")
        .upsert(mediaLibraryQueue, {
          onConflict: "user_id,file_url",
          ignoreDuplicates: true,
        });

      if (!mediaError) {
        mediaImportedCount = mediaLibraryQueue.length;
      } else {
        console.warn("Media library import warning:", mediaError.message);
      }
    }

    console.log(`Import complete: ${insertedCount} posts, ${imagesStored} images stored, ${imagesFailed} failed, ${duplicateCount} duplicates`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: insertedCount,
        duplicates: duplicateCount,
        mediaImported: mediaImportedCount,
        imagesStored,
        imagesFailed,
        total: posts.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in import-instagram-data:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
