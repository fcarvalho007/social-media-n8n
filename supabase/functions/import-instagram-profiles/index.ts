import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allowed accounts for analytics
const ALLOWED_ACCOUNTS = [
  "frederico.m.carvalho",
  "mariiana.ai",
  "marcogouveia.pt",
  "martimsilvai",
  "robs.cortez",
  "escolamarketingdigital.pt",
  "paulofaustino",
  "samurairt",
];

const MIN_DATE = new Date("2025-01-01T00:00:00Z");

interface ProfileData {
  id: string;
  username: string;
  fullName?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  verified?: boolean;
  isBusinessAccount?: boolean;
  businessCategoryName?: string | null;
  profilePicUrl?: string;
  profilePicUrlHD?: string;
  externalUrl?: string;
  externalUrls?: any[];
  highlightReelCount?: number;
  private?: boolean;
  latestPosts?: any[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // Parse request body
    const { profiles } = await req.json();
    
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No profiles provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${profiles.length} profiles`);

    // Filter to allowed accounts only
    const filteredProfiles = profiles.filter((p: ProfileData) => 
      ALLOWED_ACCOUNTS.includes(p.username)
    );

    console.log(`Filtered to ${filteredProfiles.length} allowed profiles`);

    if (filteredProfiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No allowed accounts found in data",
          allowedAccounts: ALLOWED_ACCOUNTS 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    let profilesImported = 0;
    let profilesDuplicate = 0;
    let postsImported = 0;
    let postsDuplicate = 0;

    // Process each profile
    for (const profile of filteredProfiles) {
      try {
        // Check if profile already exists for today
        const { data: existingProfile } = await supabase
          .from("instagram_profiles")
          .select("id")
          .eq("username", profile.username)
          .eq("scraped_date", today)
          .single();

        if (existingProfile) {
          console.log(`Profile ${profile.username} already exists for today, updating...`);
          
          // Update existing profile
          const { error: updateError } = await supabase
            .from("instagram_profiles")
            .update({
              instagram_id: profile.id,
              full_name: profile.fullName || null,
              biography: profile.biography || null,
              followers_count: profile.followersCount || 0,
              follows_count: profile.followsCount || 0,
              posts_count: profile.postsCount || 0,
              is_verified: profile.verified || false,
              is_business_account: profile.isBusinessAccount || false,
              business_category: profile.businessCategoryName || null,
              profile_pic_url: profile.profilePicUrl || null,
              profile_pic_url_hd: profile.profilePicUrlHD || null,
              external_url: profile.externalUrl || null,
              external_urls: profile.externalUrls || [],
              highlight_reel_count: profile.highlightReelCount || 0,
              is_private: profile.private || false,
              scraped_at: new Date().toISOString(),
            })
            .eq("id", existingProfile.id);

          if (updateError) {
            console.error(`Error updating profile ${profile.username}:`, updateError);
          }
          
          profilesDuplicate++;
        } else {
          // Insert new profile
          const { error: insertError } = await supabase
            .from("instagram_profiles")
            .insert({
              user_id: user.id,
              instagram_id: profile.id,
              username: profile.username,
              full_name: profile.fullName || null,
              biography: profile.biography || null,
              followers_count: profile.followersCount || 0,
              follows_count: profile.followsCount || 0,
              posts_count: profile.postsCount || 0,
              is_verified: profile.verified || false,
              is_business_account: profile.isBusinessAccount || false,
              business_category: profile.businessCategoryName || null,
              profile_pic_url: profile.profilePicUrl || null,
              profile_pic_url_hd: profile.profilePicUrlHD || null,
              external_url: profile.externalUrl || null,
              external_urls: profile.externalUrls || [],
              highlight_reel_count: profile.highlightReelCount || 0,
              is_private: profile.private || false,
              scraped_date: today,
            });

          if (insertError) {
            console.error(`Error inserting profile ${profile.username}:`, insertError);
          } else {
            profilesImported++;
            console.log(`Imported profile: ${profile.username}`);
          }
        }

        // Process latestPosts if available
        if (profile.latestPosts && Array.isArray(profile.latestPosts)) {
          console.log(`Processing ${profile.latestPosts.length} posts for ${profile.username}`);

          for (const post of profile.latestPosts) {
            try {
              // Check post date
              const postDate = new Date(post.timestamp);
              if (postDate < MIN_DATE) {
                continue; // Skip posts before 2025
              }

              // Check if post already exists
              const { data: existingPost } = await supabase
                .from("instagram_analytics")
                .select("id")
                .eq("shortcode", post.shortCode)
                .single();

              if (existingPost) {
                postsDuplicate++;
                continue;
              }

              // Determine post type
              let postType = "Image";
              if (post.type === "Video" || post.productType === "clips") {
                postType = "Reel";
              } else if (post.type === "Sidecar") {
                postType = "Sidecar";
              }

              // Collect media URLs
              const mediaUrls: string[] = [];
              if (post.displayUrl) mediaUrls.push(post.displayUrl);
              if (post.images && Array.isArray(post.images)) {
                mediaUrls.push(...post.images.slice(0, 10));
              }

              // Extract hashtags from caption
              const hashtags: string[] = [];
              if (post.caption) {
                const matches = post.caption.match(/#[\w\u00C0-\u024F]+/g);
                if (matches) {
                  hashtags.push(...matches.map((h: string) => h.toLowerCase()));
                }
              }

              // Calculate engagement rate
              const likes = post.likesCount || 0;
              const comments = post.commentsCount || 0;
              const views = post.videoViewCount || 0;
              const engagement = views > 0 
                ? ((likes + comments) / views) * 100 
                : 0;

              // Insert post
              const { error: postError } = await supabase
                .from("instagram_analytics")
                .insert({
                  user_id: user.id,
                  post_url: post.url || `https://www.instagram.com/p/${post.shortCode}/`,
                  shortcode: post.shortCode,
                  post_type: postType,
                  caption: post.caption || null,
                  hashtags: hashtags,
                  likes_count: likes,
                  comments_count: comments,
                  views_count: views,
                  engagement_rate: engagement,
                  media_urls: mediaUrls,
                  thumbnail_url: post.displayUrl || null,
                  posted_at: post.timestamp,
                  owner_username: post.ownerUsername || profile.username,
                  is_video: post.type === "Video",
                  video_duration: post.videoDuration || null,
                  dimensions_width: post.dimensionsWidth || null,
                  dimensions_height: post.dimensionsHeight || null,
                });

              if (postError) {
                console.error(`Error inserting post ${post.shortCode}:`, postError);
              } else {
                postsImported++;
              }
            } catch (postErr) {
              console.error(`Error processing post:`, postErr);
            }
          }
        }
      } catch (profileErr) {
        console.error(`Error processing profile ${profile.username}:`, profileErr);
      }
    }

    console.log(`Import complete: ${profilesImported} profiles, ${postsImported} posts`);

    return new Response(
      JSON.stringify({
        success: true,
        profiles: {
          imported: profilesImported,
          updated: profilesDuplicate,
          total: filteredProfiles.length,
        },
        posts: {
          imported: postsImported,
          duplicates: postsDuplicate,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Import error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
