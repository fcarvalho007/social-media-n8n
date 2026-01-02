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

// Store all media URLs (for carousels)
async function storeAllMediaUrls(
  supabase: any,
  post: InstagramPost,
  userId: string
): Promise<string[]> {
  const storedUrls: string[] = [];
  const shortcode = post.shortCode || "unknown";
  
  // Collect all image URLs
  const allUrls: { url: string; index: number }[] = [];
  
  if (post.displayUrl) {
    allUrls.push({ url: post.displayUrl, index: 0 });
  }
  
  if (post.childPosts && Array.isArray(post.childPosts)) {
    post.childPosts.forEach((child, idx) => {
      if (child.displayUrl) {
        allUrls.push({ url: child.displayUrl, index: idx + 1 });
      }
    });
  }
  
  if (post.images && Array.isArray(post.images)) {
    post.images.forEach((url, idx) => {
      if (url && !allUrls.some(u => u.url === url)) {
        allUrls.push({ url, index: allUrls.length });
      }
    });
  }

  // Download and store each image
  for (const { url, index } of allUrls.slice(0, 10)) { // Max 10 images per post
    if (url.includes("supabase") && url.includes("storage")) {
      storedUrls.push(url);
      continue;
    }

    const result = await downloadWithRetry([url], 2); // Fewer retries for secondary images
    if (result) {
      const { blob, contentType } = result;
      const extension = contentType.includes("png") ? "png" : "jpg";
      const fileName = `analytics/${userId}/${shortcode}_${index}.${extension}`;

      const { error } = await supabase.storage
        .from("publications")
        .upload(fileName, blob, { contentType, upsert: true });

      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from("publications")
          .getPublicUrl(fileName);
        storedUrls.push(publicUrl);
      } else {
        storedUrls.push(url); // Keep original as fallback
      }
    } else {
      storedUrls.push(url); // Keep original as fallback
    }
  }

  return storedUrls;
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
    const shortcodes = posts.map(p => p.shortCode).filter(Boolean);
    const { data: existingPosts } = await supabaseClient
      .from("instagram_analytics")
      .select("shortcode")
      .eq("user_id", user.id)
      .in("shortcode", shortcodes);

    const existingShortcodes = new Set((existingPosts || []).map(p => p.shortcode));
    const duplicateCount = posts.filter(p => p.shortCode && existingShortcodes.has(p.shortCode)).length;

    // Transform posts to database format
    const analyticsData = [];
    let imagesStored = 0;
    let imagesFailed = 0;
    
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

      // Store thumbnail image permanently
      const storedThumbnailUrl = await downloadAndUploadImage(supabaseAdmin, post, user.id);
      if (storedThumbnailUrl?.includes("supabase")) {
        imagesStored++;
      } else if (post.displayUrl) {
        imagesFailed++;
      }

      // Store all media URLs for carousels
      const storedMediaUrls = await storeAllMediaUrls(supabaseAdmin, post, user.id);

      // Calculate engagement rate
      const totalEngagement = (post.likesCount || 0) + (post.commentsCount || 0);
      
      analyticsData.push({
        user_id: user.id,
        post_url: post.url || `https://instagram.com/p/${post.shortCode}`,
        shortcode: post.shortCode,
        post_type: post.type || (post.isVideo ? "Video" : "Image"),
        caption: post.caption,
        hashtags,
        likes_count: post.likesCount || 0,
        comments_count: post.commentsCount || 0,
        views_count: post.videoViewCount || 0,
        engagement_rate: totalEngagement,
        media_urls: storedMediaUrls.length > 0 ? storedMediaUrls : [post.displayUrl].filter(Boolean),
        thumbnail_url: storedThumbnailUrl || post.displayUrl,
        posted_at: post.timestamp ? new Date(post.timestamp).toISOString() : null,
        location_name: post.locationName,
        owner_username: post.ownerUsername,
        dimensions_width: post.dimensionsWidth,
        dimensions_height: post.dimensionsHeight,
        is_video: post.isVideo || post.type === "Video",
        video_duration: post.videoDuration,
      });
    }

    // Insert only new posts
    let insertedCount = 0;
    if (analyticsData.length > 0) {
      const { data: insertedData, error: insertError } = await supabaseClient
        .from("instagram_analytics")
        .insert(analyticsData)
        .select();

      if (insertError) {
        console.error("Error inserting analytics:", insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      insertedCount = insertedData?.length || 0;
    }

    // Optionally import images to media library
    let mediaImportedCount = 0;
    if (alsoImportToMediaLibrary && analyticsData.length > 0) {
      const mediaLibraryData = analyticsData
        .filter((post) => post.thumbnail_url)
        .map((post) => ({
          user_id: user.id,
          file_url: post.thumbnail_url!,
          file_name: `instagram-${post.shortcode || post.post_url.split("/").pop()}.jpg`,
          file_type: post.is_video ? "video/mp4" : "image/jpeg",
          source: "instagram_import",
          tags: post.hashtags?.slice(0, 5) || [],
        }));

      if (mediaLibraryData.length > 0) {
        const { error: mediaError } = await supabaseClient
          .from("media_library")
          .upsert(mediaLibraryData, { 
            onConflict: "user_id,file_url",
            ignoreDuplicates: true 
          });

        if (!mediaError) {
          mediaImportedCount = mediaLibraryData.length;
        } else {
          console.warn("Media library import warning:", mediaError.message);
        }
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
