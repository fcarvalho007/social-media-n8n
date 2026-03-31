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
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

// Helper: list ALL files in a storage bucket (paginated), with metadata
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
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const results = {
      failedPostsFiles: 0,
      publishedPostsFiles: 0,
      orphanFilesDeleted: 0,
      totalStorageBytes: 0,
      freedBytes: 0,
      errors: [] as string[],
    };

    // 1. Get ALL failed posts older than 7 days — using failed_at OR created_at as fallback
    const failedPostsWithDate = await fetchAllRows(
      supabase,
      "posts",
      "id, template_a_images, template_b_images, media_items, cover_image_url",
      [
        { column: "status", op: "eq", value: "failed" },
        { column: "failed_at", op: "lt", value: sevenDaysAgo },
      ]
    );

    // Bug fix: also get failed posts where failed_at is NULL but created_at is old
    const failedPostsNullDate = await fetchAllRows(
      supabase,
      "posts",
      "id, template_a_images, template_b_images, media_items, cover_image_url",
      [
        { column: "status", op: "eq", value: "failed" },
        { column: "failed_at", op: "is", value: "null" },
        { column: "created_at", op: "lt", value: sevenDaysAgo },
      ]
    );

    const failedPosts = [...failedPostsWithDate, ...failedPostsNullDate];

    // 2. Get ALL published posts older than 7 days
    const publishedPosts = await fetchAllRows(
      supabase,
      "posts",
      "id, template_a_images, template_b_images, media_items, cover_image_url",
      [
        { column: "status", op: "eq", value: "published" },
        { column: "published_at", op: "lt", value: sevenDaysAgo },
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

    // 3. Direct storage cleanup — list all files in each bucket and find old ones
    const buckets = ["publications", "pdfs", "post-covers", "ai-generated-images"];
    const storageInfo: Record<string, { fileCount: number; totalBytes: number; oldFiles: number; oldBytes: number }> = {};
    const orphanFilesToDelete: { bucket: string; path: string }[] = [];
    const postFilePathsSet = new Set(filesToDelete.map(f => `${f.bucket}/${f.path}`));

    for (const bucket of buckets) {
      const files = await listAllFiles(supabase, bucket);
      let totalBytes = 0;
      let oldFiles = 0;
      let oldBytes = 0;

      for (const file of files) {
        // Skip folders
        if (!file.name || file.id === null) continue;
        const fileSize = file.metadata?.size || 0;
        totalBytes += fileSize;

        const fileCreated = file.created_at ? new Date(file.created_at) : null;
        if (fileCreated && fileCreated < new Date(sevenDaysAgo)) {
          oldFiles++;
          oldBytes += fileSize;
          // Add to orphan list if not already tracked via posts
          const fullPath = `${bucket}/${file.name}`;
          if (!postFilePathsSet.has(fullPath)) {
            orphanFilesToDelete.push({ bucket, path: file.name });
          }
        }
      }

      storageInfo[bucket] = { fileCount: files.length, totalBytes, oldFiles, oldBytes };
      results.totalStorageBytes += totalBytes;
      results.freedBytes += oldBytes;
    }

    // 4. Execute deletions (or just count in dry run)
    if (!dryRun) {
      // Combine post-referenced files + orphan files
      const allFilesToDelete = [...filesToDelete, ...orphanFilesToDelete];
      const byBucket: Record<string, string[]> = {};
      for (const f of allFilesToDelete) {
        if (!byBucket[f.bucket]) byBucket[f.bucket] = [];
        byBucket[f.bucket].push(f.path);
      }

      // Deduplicate paths per bucket
      for (const bucket of Object.keys(byBucket)) {
        byBucket[bucket] = [...new Set(byBucket[bucket])];
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

      results.orphanFilesDeleted = orphanFilesToDelete.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        filesToDelete: filesToDelete.length + orphanFilesToDelete.length,
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
