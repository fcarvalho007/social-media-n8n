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
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
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

    // Transform posts to database format
    const analyticsData = posts.map((post) => {
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

      // Calculate engagement rate (simplified - without followers count)
      const totalEngagement = (post.likesCount || 0) + (post.commentsCount || 0);
      
      return {
        user_id: user.id,
        post_url: post.url || `https://instagram.com/p/${post.shortCode}`,
        shortcode: post.shortCode,
        post_type: post.type || (post.isVideo ? "Video" : "Image"),
        caption: post.caption,
        hashtags,
        likes_count: post.likesCount || 0,
        comments_count: post.commentsCount || 0,
        views_count: post.videoViewCount || 0,
        engagement_rate: totalEngagement, // Store raw engagement for now
        media_urls: mediaUrls,
        thumbnail_url: post.displayUrl,
        posted_at: post.timestamp ? new Date(post.timestamp).toISOString() : null,
        location_name: post.locationName,
        owner_username: post.ownerUsername,
        dimensions_width: post.dimensionsWidth,
        dimensions_height: post.dimensionsHeight,
        is_video: post.isVideo || post.type === "Video",
        video_duration: post.videoDuration,
      };
    });

    // Upsert to handle duplicates
    const { data: insertedData, error: insertError } = await supabase
      .from("instagram_analytics")
      .upsert(analyticsData, { 
        onConflict: "user_id,post_url",
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error("Error inserting analytics:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optionally import images to media library
    let mediaImportedCount = 0;
    if (alsoImportToMediaLibrary) {
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
        const { error: mediaError } = await supabase
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

    console.log(`Successfully imported ${insertedData?.length || 0} posts, ${mediaImportedCount} media items`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: insertedData?.length || 0,
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
