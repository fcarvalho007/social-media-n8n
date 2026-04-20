import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledJob {
  id: string;
  post_id: string | null;
  story_id: string | null;
  job_type: 'post' | 'story';
  scheduled_for: string;
  status: string;
  attempts: number;
  max_attempts: number;
  webhook_url: string | null;
  payload: any;
}

// Helper function to validate URL
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Helper function to calculate next retry time
function calculateNextRetry(attempts: number): string {
  const now = new Date();
  let delayMinutes = 1;
  
  if (attempts === 1) delayMinutes = 1;
  else if (attempts === 2) delayMinutes = 5;
  else delayMinutes = 15;
  
  now.setMinutes(now.getMinutes() + delayMinutes);
  return now.toISOString();
}

// Process a single scheduled job with retry logic
async function processScheduledJob(
  supabase: any,
  job: ScheduledJob,
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  console.log(`[Job ${job.id}] Processing ${job.job_type} job...`);
  
  // Validate webhook URL
  if (!isValidUrl(webhookUrl)) {
    const errorMsg = `Invalid webhook URL: '${webhookUrl}'`;
    console.error(`[Job ${job.id}] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job.payload),
    });
    
    if (!response.ok) {
      const errorMsg = `Webhook failed with status ${response.status}: ${response.statusText}`;
      console.error(`[Job ${job.id}] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
    
    console.log(`[Job ${job.id}] Successfully sent to webhook`);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Job ${job.id}] Error: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

// Update job status after processing
async function updateJobStatus(
  supabase: any,
  job: ScheduledJob,
  success: boolean,
  errorMessage?: string
) {
  const now = new Date().toISOString();
  const newAttempts = job.attempts + 1;
  
  if (success) {
    // Mark as completed
    await supabase.from('scheduled_jobs').update({
      status: 'completed',
      attempts: newAttempts,
      last_attempt_at: now,
      completed_at: now,
      error_message: null,
    }).eq('id', job.id);
    
    // Update post/story status
    if (job.job_type === 'post' && job.post_id) {
      await supabase.from('posts').update({
        status: 'published',
        published_at: now,
        scheduled_date: null,
      }).eq('id', job.post_id);
    } else if (job.job_type === 'story' && job.story_id) {
      await supabase.from('stories').update({
        scheduled_date: null,
      }).eq('id', job.story_id);
    }
    
    console.log(`[Job ${job.id}] Marked as completed`);
  } else {
    // Get existing error log
    const { data: existingJob } = await supabase
      .from('scheduled_jobs')
      .select('error_log')
      .eq('id', job.id)
      .single();
    
    const errorLog = existingJob?.error_log || [];
    errorLog.push({
      attempt: newAttempts,
      timestamp: now,
      error: errorMessage,
    });
    
    if (newAttempts >= job.max_attempts) {
      // Move to requires_attention
      await supabase.from('scheduled_jobs').update({
        status: 'requires_attention',
        attempts: newAttempts,
        last_attempt_at: now,
        error_message: errorMessage,
        error_log: errorLog,
      }).eq('id', job.id);
      
      // Update post status to failed
      if (job.job_type === 'post' && job.post_id) {
        await supabase.from('posts').update({
          status: 'failed',
          failed_at: now,
          error_log: errorMessage,
        }).eq('id', job.post_id);
      } else if (job.job_type === 'story' && job.story_id) {
        await supabase.from('stories').update({
          status: 'failed',
          error_log: errorMessage,
        }).eq('id', job.story_id);
      }
      
      console.log(`[Job ${job.id}] Moved to requires_attention after ${newAttempts} attempts`);
    } else {
      // Schedule retry
      const nextRetry = calculateNextRetry(newAttempts);
      await supabase.from('scheduled_jobs').update({
        status: 'failed',
        attempts: newAttempts,
        last_attempt_at: now,
        next_retry_at: nextRetry,
        error_message: errorMessage,
        error_log: errorLog,
      }).eq('id', job.id);
      
      console.log(`[Job ${job.id}] Scheduled for retry at ${nextRetry} (attempt ${newAttempts}/${job.max_attempts})`);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('========================================');
    console.log('Starting scheduled posts check...');
    console.log(`Timestamp: ${new Date().toISOString()}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const n8nWebhookUrl = Deno.env.get('N8N_CALLBACK_WEBHOOK_URL');
    const n8nStoriesWebhookUrl = Deno.env.get('N8N_STORIES_WEBHOOK_SECRET');

    // Validate webhook URLs at startup
    console.log('[Config] Validating webhook URLs...');
    console.log(`[Config] Posts webhook valid: ${n8nWebhookUrl ? isValidUrl(n8nWebhookUrl) : 'NOT SET'}`);
    console.log(`[Config] Stories webhook valid: ${n8nStoriesWebhookUrl ? isValidUrl(n8nStoriesWebhookUrl) : 'NOT SET'}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // ========== PHASE 1: Process scheduled_jobs table (new system) ==========
    console.log('\n[Phase 1] Checking scheduled_jobs table...');
    
    // TTL: ignore jobs older than 7 days to avoid burning invocations on stale work
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingJobs, error: jobsError } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('scheduled_for', now)
      .gte('scheduled_for', sevenDaysAgo)
      .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
      .order('scheduled_for', { ascending: true })
      .limit(50);

    if (jobsError) {
      console.error('[Phase 1] Error fetching scheduled jobs:', jobsError);
    } else {
      console.log(`[Phase 1] Found ${pendingJobs?.length || 0} jobs to process`);
      
      for (const job of pendingJobs || []) {
        // Mark as processing
        await supabase.from('scheduled_jobs').update({ 
          status: 'processing',
          last_attempt_at: now,
        }).eq('id', job.id);
        
        // Determine webhook URL
        let webhookUrl = job.webhook_url;
        if (!webhookUrl) {
          webhookUrl = job.job_type === 'post' ? n8nWebhookUrl : n8nStoriesWebhookUrl;
        }
        
        if (!webhookUrl) {
          console.error(`[Job ${job.id}] No webhook URL configured for ${job.job_type}`);
          await updateJobStatus(supabase, job, false, `No webhook URL configured for ${job.job_type}`);
          continue;
        }
        
        const result = await processScheduledJob(supabase, job, webhookUrl);
        await updateJobStatus(supabase, job, result.success, result.error);
      }
    }

    // ========== PHASE 2: Process legacy posts (backward compatibility) ==========
    console.log('\n[Phase 2] Checking legacy scheduled posts...');
    
    // Only process posts scheduled in the last 7 days — older posts are stale and clutter logs
    const postsTtlCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: scheduledPosts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .in('status', ['approved', 'scheduled'])
      .not('scheduled_date', 'is', null)
      .lte('scheduled_date', now)
      .gte('scheduled_date', postsTtlCutoff);

    if (postsError) {
      console.error('[Phase 2] Error fetching scheduled posts:', postsError);
    } else {
      console.log(`[Phase 2] Found ${scheduledPosts?.length || 0} legacy scheduled posts`);

      for (const post of scheduledPosts || []) {
        // Check if already has a scheduled_job
        const { data: existingJob } = await supabase
          .from('scheduled_jobs')
          .select('id')
          .eq('post_id', post.id)
          .single();

        if (existingJob) {
          console.log(`[Post ${post.id}] Already has a scheduled_job, skipping legacy processing`);
          continue;
        }

        // Validate webhook URL before processing
        if (!n8nWebhookUrl || !isValidUrl(n8nWebhookUrl)) {
          console.error(`[Post ${post.id}] Invalid or missing webhook URL: '${n8nWebhookUrl}'`);
          continue;
        }

        try {
          console.log(`[Post ${post.id}] Processing legacy post...`);

          const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              post_id: post.id,
              status: 'approved',
              selected_template: post.selected_template,
              caption_final: post.caption_edited,
              hashtags_final: post.hashtags_edited,
              reviewed_by: post.reviewed_by,
              reviewed_at: post.reviewed_at,
              notes: post.notes,
            }),
          });

          if (!response.ok) {
            throw new Error(`N8N webhook failed: ${response.statusText}`);
          }

          console.log(`[Post ${post.id}] Sent to N8N successfully`);

          await supabase.from('posts').update({ 
            scheduled_date: null, 
            status: 'published', 
            published_at: now 
          }).eq('id', post.id);

          console.log(`[Post ${post.id}] Marked as published`);
        } catch (error) {
          console.error(`[Post ${post.id}] Error:`, error);
        }
      }
    }

    // ========== PHASE 3: Process legacy stories (backward compatibility) ==========
    console.log('\n[Phase 3] Checking legacy scheduled stories...');
    
    // Only process stories scheduled in the last 7 days
    const storiesTtlCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: scheduledStories, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .eq('status', 'approved')
      .not('scheduled_date', 'is', null)
      .lte('scheduled_date', now)
      .gte('scheduled_date', storiesTtlCutoff);

    if (storiesError) {
      console.error('[Phase 3] Error fetching scheduled stories:', storiesError);
    } else {
      console.log(`[Phase 3] Found ${scheduledStories?.length || 0} legacy scheduled stories`);

      for (const story of scheduledStories || []) {
        // Check if already has a scheduled_job
        const { data: existingJob } = await supabase
          .from('scheduled_jobs')
          .select('id')
          .eq('story_id', story.id)
          .single();

        if (existingJob) {
          console.log(`[Story ${story.id}] Already has a scheduled_job, skipping legacy processing`);
          continue;
        }

        // Validate webhook URL before processing
        if (!n8nStoriesWebhookUrl || !isValidUrl(n8nStoriesWebhookUrl)) {
          console.error(`[Story ${story.id}] Invalid or missing stories webhook URL: '${n8nStoriesWebhookUrl}'`);
          continue;
        }

        try {
          console.log(`[Story ${story.id}] Processing legacy story...`);

          const response = await fetch(n8nStoriesWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              post_id: story.id,
              status: 'approved',
              caption_final: story.caption,
              reviewed_by: story.reviewed_by,
              reviewed_at: story.reviewed_at,
            }),
          });

          if (!response.ok) {
            throw new Error(`N8N stories webhook failed: ${response.statusText}`);
          }

          console.log(`[Story ${story.id}] Sent to N8N successfully`);

          await supabase.from('stories').update({ 
            scheduled_date: null 
          }).eq('id', story.id);

          console.log(`[Story ${story.id}] Marked as sent`);
        } catch (error) {
          console.error(`[Story ${story.id}] Error:`, error);
        }
      }
    }

    // ========== SUMMARY ==========
    const totalProcessed = (pendingJobs?.length || 0) + (scheduledPosts?.length || 0) + (scheduledStories?.length || 0);
    console.log('\n========================================');
    console.log(`Processing complete. Total items checked: ${totalProcessed}`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now,
        jobs_processed: pendingJobs?.length || 0,
        legacy_posts: scheduledPosts?.length || 0,
        legacy_stories: scheduledStories?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error in send-scheduled-posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
