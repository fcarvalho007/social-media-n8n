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
  timestamp?: string;
  locationName?: string;
  ownerUsername?: string;
  dimensionsWidth?: number;
  dimensionsHeight?: number;
  isVideo?: boolean;
  videoDuration?: number;
}

// Download image and upload to Supabase Storage
async function downloadAndUploadImage(
  supabase: any,
  imageUrl: string,
  shortcode: string,
  userId: string
): Promise<string | null> {
  try {
    // Skip if URL is already from Supabase Storage
    if (imageUrl.includes('supabase') && imageUrl.includes('storage')) {
      return imageUrl;
    }

    console.log(`Downloading image for ${shortcode}...`);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to download image for ${shortcode}: ${response.status}`);
      return null;
    }

    const imageBlob = await response.blob();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    const fileName = `analytics/${userId}/${shortcode}.${extension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('publications')
      .upload(fileName, imageBlob, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.warn(`Failed to upload image for ${shortcode}:`, uploadError.message);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('publications')
      .getPublicUrl(fileName);

    console.log(`Successfully stored image for ${shortcode}`);
    return publicUrl;
  } catch (error) {
    console.warn(`Error processing image for ${shortcode}:`, error);
    return null;
  }
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

      // Build media URLs array
      const mediaUrls: string[] = [];
      if (post.displayUrl) mediaUrls.push(post.displayUrl);
      if (post.images && Array.isArray(post.images)) {
        mediaUrls.push(...post.images.filter((img) => img && !mediaUrls.includes(img)));
      }

      // Try to download and store the thumbnail permanently
      let storedThumbnailUrl = post.displayUrl || null;
      if (post.displayUrl && post.shortCode) {
        const permanentUrl = await downloadAndUploadImage(
          supabaseAdmin,
          post.displayUrl,
          post.shortCode,
          user.id
        );
        if (permanentUrl) {
          storedThumbnailUrl = permanentUrl;
        }
      }

      // Calculate engagement rate (simplified - without followers count)
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
        media_urls: mediaUrls,
        thumbnail_url: storedThumbnailUrl,
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

    console.log(`Successfully imported ${insertedCount} posts (${duplicateCount} duplicates skipped), ${mediaImportedCount} media items`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: insertedCount,
        duplicates: duplicateCount,
        mediaImported: mediaImportedCount,
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
