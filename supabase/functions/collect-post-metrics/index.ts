import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const NETWORKS = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'] as const;
type Network = typeof NETWORKS[number];

type Metrics = {
  reach?: number | null;
  impressions?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
  video_completion_rate?: number | null;
  raw_data?: Record<string, unknown>;
};

type PostRow = {
  id: string;
  user_id: string;
  caption: string | null;
  hashtags: string[] | null;
  first_comment: string | null;
  alt_texts: Record<string, unknown> | null;
  media_items: Array<{ type?: string; isVideo?: boolean; duration?: number }> | null;
  template_a_images: string[] | null;
  selected_networks: string[] | null;
  post_type: string | null;
  content_type: string | null;
  published_at: string | null;
  external_post_ids: Record<string, string> | null;
  publish_metadata: Record<string, unknown> | null;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const numeric = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;

function calculateEngagementRate(metrics: Metrics) {
  const weighted = (metrics.likes || 0) + (metrics.comments || 0) * 2 + (metrics.shares || 0) * 3 + (metrics.saves || 0) * 2;
  return metrics.reach && metrics.reach > 0 ? weighted / metrics.reach : 0;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = average(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

function classifyPerformance(rate: number, previousRates: number[]) {
  const base = previousRates.filter(Number.isFinite).slice(0, 30);
  if (base.length < 10) return 'insufficient_data';
  const mean = average(base);
  const deviation = stdDev(base);
  if (rate > mean + deviation) return 'above_average';
  if (rate > mean) return 'worked';
  if (rate < mean - deviation) return 'did_not_work';
  return 'normal';
}

function networksForPost(post: PostRow): Network[] {
  const values = new Set([...(post.selected_networks || [])]);
  if (values.size === 0 && post.post_type) values.add(post.post_type.split('_')[0]);
  return Array.from(values).filter((network): network is Network => NETWORKS.includes(network as Network));
}

function externalReference(post: PostRow, network: Network) {
  return post.external_post_ids?.[network] || post.external_post_ids?.getlate || post.external_post_ids?.[`${network}_post_id`] || null;
}

async function fetchMetrics(network: Network, externalId: string | null): Promise<Metrics> {
  if (!externalId) return { raw_data: { status: 'skipped', reason: 'missing_external_reference' } };

  if (network === 'instagram' || network === 'facebook') {
    const token = Deno.env.get('META_GRAPH_ACCESS_TOKEN');
    if (!token) return { raw_data: { status: 'skipped', reason: 'missing_meta_token', externalId } };
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(externalId)}/insights?metric=impressions,reach,saved,likes,comments,shares&access_token=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { raw_data: { status: 'error', provider: 'meta', externalId, data } };
    const values = Object.fromEntries((data.data || []).map((item: any) => [item.name, item.values?.[0]?.value]));
    return { reach: numeric(values.reach), impressions: numeric(values.impressions), saves: numeric(values.saved), likes: numeric(values.likes), comments: numeric(values.comments), shares: numeric(values.shares), raw_data: data };
  }

  if (network === 'linkedin') {
    const token = Deno.env.get('LINKEDIN_ACCESS_TOKEN');
    if (!token) return { raw_data: { status: 'skipped', reason: 'missing_linkedin_token', externalId } };
    const response = await fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(externalId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { raw_data: { status: 'error', provider: 'linkedin', externalId, data } };
    return { likes: numeric(data.likesSummary?.totalLikes), comments: numeric(data.commentsSummary?.totalFirstLevelComments), raw_data: data };
  }

  if (network === 'youtube') {
    const token = Deno.env.get('YOUTUBE_ANALYTICS_TOKEN');
    if (!token) return { raw_data: { status: 'skipped', reason: 'missing_youtube_token', externalId } };
    return { raw_data: { status: 'skipped', reason: 'youtube_adapter_requires_channel_context', externalId } };
  }

  if (network === 'tiktok') {
    const token = Deno.env.get('TIKTOK_DISPLAY_TOKEN');
    if (!token) return { raw_data: { status: 'skipped', reason: 'missing_tiktok_token', externalId } };
    return { raw_data: { status: 'skipped', reason: 'tiktok_adapter_requires_business_metrics_scope', externalId } };
  }

  return { raw_data: { status: 'skipped', reason: 'unsupported_network', externalId } };
}

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const hashtagRegex = /#[\p{L}\p{N}_]+/gu;

function extractFeatures(post: PostRow, detectedTone: string) {
  const caption = post.caption || '';
  const firstSentence = caption.split(/[.!?\n]/)[0] || '';
  const firstLine = caption.split('\n')[0] || '';
  const media = Array.isArray(post.media_items) ? post.media_items : [];
  const mediaCount = media.length || post.template_a_images?.length || 0;
  const hasVideo = media.some(item => item.type === 'video' || item.isVideo);
  const published = post.published_at ? new Date(post.published_at) : new Date();
  return {
    caption_length: caption.length,
    has_question_in_first_sentence: firstSentence.includes('?'),
    starts_with_number: /^\s*\d/.test(caption),
    has_emoji_in_first_line: emojiRegex.test(firstLine),
    has_line_breaks: caption.includes('\n'),
    hashtag_count: (caption.match(hashtagRegex) || post.hashtags || []).length,
    hashtag_types: [],
    has_first_comment: Boolean(post.first_comment?.trim()),
    has_alt_text: Boolean(post.alt_texts && JSON.stringify(post.alt_texts) !== '{}'),
    has_link_in_caption: /https?:\/\/|www\./i.test(caption),
    media_type: mediaCount === 0 ? 'text_only' : mediaCount > 1 ? 'carousel' : hasVideo || post.post_type?.includes('video') || post.post_type?.includes('reel') ? 'video' : 'image',
    media_count: mediaCount,
    video_duration_seconds: media.find(item => Number(item.duration))?.duration,
    published_at_hour: published.getHours(),
    published_at_day_of_week: published.getDay(),
    detected_tone: detectedTone,
  };
}

function detectTone(post: PostRow) {
  const caption = (post.caption || '').trim();
  if (!caption) return 'neutral';
  if (/\b(como|passos|método|framework|dados|estratégia|processo)\b/i.test(caption)) return 'technical';
  if (/\b(sentes|emoção|história|medo|coragem|sonho|vida)\b/i.test(caption)) return 'emotional';
  if (/\b😂|😅|ironia|humor|piada\b/i.test(caption)) return 'humor';
  if (caption.length < 280 || /\b(faz|guarda|partilha|comenta|decide)\b/i.test(caption)) return 'direct';
  return 'neutral';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const cronSecret = Deno.env.get('AI_CRON_SECRET');
    if (!cronSecret) {
      console.error('[collect-post-metrics] AI_CRON_SECRET missing');
      return json({ success: false, error: 'Segredo interno não configurado' }, 500);
    }
    if (req.headers.get('x-cron-secret') !== cronSecret) {
      return json({ success: false, error: 'Não autorizado' }, 401);
    }

    const url = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Backend configuration missing');
    const supabase = createClient(url, serviceKey);

    const now = Date.now();
    const from = new Date(now - 96 * 60 * 60 * 1000).toISOString();
    const to = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id,user_id,caption,hashtags,first_comment,alt_texts,media_items,template_a_images,selected_networks,post_type,content_type,published_at,external_post_ids,publish_metadata')
      .eq('status', 'published')
      .not('user_id', 'is', null)
      .gte('published_at', from)
      .lte('published_at', to)
      .limit(200);
    if (error) throw error;

    let processed = 0;
    const skipped: Array<Record<string, unknown>> = [];

    for (const post of (posts || []) as PostRow[]) {
      const { data: prefs } = await supabase.from('ai_preferences').select('insights_enabled').eq('user_id', post.user_id).maybeSingle();
      const insightsEnabled = prefs?.insights_enabled !== false;
      const networks = networksForPost(post);
      let lastRate = 0;
      let lastNetwork: Network | null = null;

      for (const network of networks) {
        const externalId = externalReference(post, network);
        const metrics = await fetchMetrics(network, externalId);
        const engagementRate = calculateEngagementRate(metrics);
        const capturedAt = new Date();
        const capturedHour = new Date(capturedAt);
        capturedHour.setUTCMinutes(0, 0, 0);
        lastRate = engagementRate;
        lastNetwork = network;

        const metricPayload = {
          post_id: post.id,
          user_id: post.user_id,
          network,
          external_post_id: externalId,
          reach: metrics.reach,
          impressions: metrics.impressions,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          saves: metrics.saves,
          clicks: metrics.clicks,
          video_completion_rate: metrics.video_completion_rate,
          engagement_rate_normalized: engagementRate,
          raw_data: metrics.raw_data || {},
          captured_at: capturedAt.toISOString(),
          captured_hour: capturedHour.toISOString(),
        };

        await supabase.from('post_metrics_raw').upsert(metricPayload, { onConflict: 'post_id,network,captured_hour' });

        if ((metrics.raw_data as any)?.status === 'skipped') skipped.push({ post_id: post.id, network, reason: (metrics.raw_data as any).reason });
      }

      if (lastNetwork) {
        const { data: previous } = await supabase
          .from('posts')
          .select('engagement_rate')
          .eq('user_id', post.user_id)
          .eq('status', 'published')
          .contains('selected_networks', [lastNetwork])
          .lt('published_at', post.published_at)
          .not('engagement_rate', 'is', null)
          .order('published_at', { ascending: false })
          .limit(30);
        const classification = classifyPerformance(lastRate, (previous || []).map((item: any) => Number(item.engagement_rate)));
        const updatePayload: Record<string, unknown> = { engagement_rate: lastRate, performance_classification: classification, metrics_captured_at: new Date().toISOString() };
        if (insightsEnabled) updatePayload.ai_features_extracted = extractFeatures(post, detectTone(post));
        await supabase.from('posts').update(updatePayload).eq('id', post.id);
      }
      processed += 1;
    }

    return json({ success: true, processed, skipped });
  } catch (error) {
    console.error('[collect-post-metrics]', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }, 500);
  }
});
