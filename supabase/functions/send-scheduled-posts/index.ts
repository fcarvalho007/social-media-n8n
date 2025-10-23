import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Post {
  id: string;
  status: string;
  selected_template: string;
  caption_edited: string;
  hashtags_edited: string[];
  reviewed_by: string;
  reviewed_at: string;
  notes: string;
  scheduled_date: string;
}

interface Story {
  id: string;
  status: string;
  caption: string;
  reviewed_by: string;
  reviewed_at: string;
  scheduled_date: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled posts check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const n8nWebhookUrl = Deno.env.get('N8N_CALLBACK_WEBHOOK_URL')!;
    const n8nStoriesWebhookUrl = Deno.env.get('N8N_STORIES_WEBHOOK_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Check for scheduled posts
    const { data: scheduledPosts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'approved')
      .not('scheduled_date', 'is', null)
      .lte('scheduled_date', now);

    if (postsError) {
      console.error('Error fetching scheduled posts:', postsError);
      throw postsError;
    }

    console.log(`Found ${scheduledPosts?.length || 0} scheduled posts`);

    // Process each scheduled post
    for (const post of scheduledPosts || []) {
      try {
        console.log(`Processing post ${post.id}...`);

        // Send to N8N
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

        console.log(`Post ${post.id} sent to N8N successfully`);

        // Update post to remove scheduled_date (mark as sent)
        await supabase
          .from('posts')
          .update({ scheduled_date: null, status: 'published' })
          .eq('id', post.id);

        console.log(`Post ${post.id} marked as published`);
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
      }
    }

    // Check for scheduled stories
    const { data: scheduledStories, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .eq('status', 'approved')
      .not('scheduled_date', 'is', null)
      .lte('scheduled_date', now);

    if (storiesError) {
      console.error('Error fetching scheduled stories:', storiesError);
      throw storiesError;
    }

    console.log(`Found ${scheduledStories?.length || 0} scheduled stories`);

    // Process each scheduled story
    for (const story of scheduledStories || []) {
      try {
        console.log(`Processing story ${story.id}...`);

        // Send to N8N
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

        console.log(`Story ${story.id} sent to N8N successfully`);

        // Update story to remove scheduled_date (mark as sent)
        await supabase
          .from('stories')
          .update({ scheduled_date: null })
          .eq('id', story.id);

        console.log(`Story ${story.id} marked as sent`);
      } catch (error) {
        console.error(`Error processing story ${story.id}:`, error);
      }
    }

    const totalProcessed = (scheduledPosts?.length || 0) + (scheduledStories?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        posts: scheduledPosts?.length || 0,
        stories: scheduledStories?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-scheduled-posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});