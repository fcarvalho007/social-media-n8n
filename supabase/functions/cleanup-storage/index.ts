import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Helper: paginate a query to get ALL rows beyond the 1000 default limit
async function fetchAllRows(
  supabase: any,
  table: string,
  select: string,
  filters: { column: string; op: string; value: any }[],
  pageSize = 500
) {
  const allRows: any[] = [];
  let from = 0;

  while (true) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);
    for (const f of filters) {
      query = query.filter(f.column, f.op, f.value);
    }
    const { data, error } = await query;
    if (error) {
      console.error(`fetchAllRows error on ${table}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break; // last page
    from += pageSize;
  }

  return allRows;
}

// Helper: list ALL files in a storage bucket (paginated)
async function listAllFiles(supabase: any, bucket: string, prefix = "") {
  const allFiles: any[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset });
    if (error) {
      console.error(`listAllFiles error on ${bucket}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allFiles.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }

  return allFiles;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { dryRun = true } = await req.json().catch(() => ({ dryRun: true }));

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const results = {
      failedPostsFiles: 0,
      publishedPostsFiles: 0,
      mediaLibraryOrphans: 0,
      bytesFreed: 0,
      errors: [] as string[],
    };

    // 1. Get ALL failed posts older than 30 days (paginated)
    const failedPosts = await fetchAllRows(
      supabase,
      "posts",
      "id, template_a_images, template_b_images, media_items, cover_image_url",
      [
        { column: "status", op: "eq", value: "failed" },
        { column: "failed_at", op: "lt", value: thirtyDaysAgo },
      ]
    );

    // 2. Get ALL published posts older than 90 days (paginated)
    const publishedPosts = await fetchAllRows(
      supabase,
      "posts",
      "id, template_a_images, template_b_images, media_items, cover_image_url",
      [
        { column: "status", op: "eq", value: "published" },
        { column: "published_at", op: "lt", value: ninetyDaysAgo },
      ]
    );

    const allPosts = [...failedPosts, ...publishedPosts];

    // Extract storage paths from post data
    const filesToDelete: { bucket: string; path: string }[] = [];

    for (const post of allPosts) {
      const urls: string[] = [
        ...(post.template_a_images || []),
        ...(post.template_b_images || []),
        ...(post.cover_image_url ? [post.cover_image_url] : []),
      ];

      if (Array.isArray(post.media_items)) {
        for (const item of post.media_items as any[]) {
          if (item?.url) urls.push(item.url);
          if (item?.preview) urls.push(item.preview);
        }
      }

      for (const url of urls) {
        if (!url || typeof url !== "string") continue;
        const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
        if (match) {
          filesToDelete.push({ bucket: match[1], path: match[2] });
        }
      }
    }

    results.failedPostsFiles = failedPosts.length;
    results.publishedPostsFiles = publishedPosts.length;

    // 3. Delete files from storage (or just count in dry run)
    if (!dryRun && filesToDelete.length > 0) {
      const byBucket: Record<string, string[]> = {};
      for (const f of filesToDelete) {
        if (!byBucket[f.bucket]) byBucket[f.bucket] = [];
        byBucket[f.bucket].push(f.path);
      }

      for (const [bucket, paths] of Object.entries(byBucket)) {
        for (let i = 0; i < paths.length; i += 100) {
          const batch = paths.slice(i, i + 100);
          const { error } = await supabase.storage.from(bucket).remove(batch);
          if (error) {
            results.errors.push(`${bucket}: ${error.message}`);
          }
        }
      }

      // Clean up media_library records for these posts
      const postIds = allPosts.map((p) => p.id);
      for (let i = 0; i < postIds.length; i += 50) {
        const batch = postIds.slice(i, i + 50);
        await supabase.from("media_library").delete().in("post_id", batch);
      }
    }

    // 4. Get storage usage estimate (paginated)
    const buckets = ["publications", "pdfs", "post-covers", "ai-generated-images"];
    const storageInfo: Record<string, { fileCount: number }> = {};

    for (const bucket of buckets) {
      const files = await listAllFiles(supabase, bucket);
      storageInfo[bucket] = { fileCount: files.length };
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        filesToDelete: filesToDelete.length,
        results,
        storageInfo,
        posts: {
          failed: failedPosts.length,
          published: publishedPosts.length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("cleanup-storage error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
