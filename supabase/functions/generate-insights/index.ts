import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type FeatureRecord = Record<string, any>;
type PostRow = {
  id: string;
  user_id: string;
  selected_networks: string[] | null;
  engagement_rate: number | null;
  ai_features_extracted: FeatureRecord | null;
  performance_classification: string | null;
  published_at: string | null;
};

type InsightCandidate = {
  insight_type: string;
  category: 'conteúdo' | 'timing' | 'formato' | 'tom';
  finding: string;
  confidence: number;
  sample_size: number;
  delta_percentage: number;
  metadata: Record<string, unknown>;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const std = (values: number[]) => {
  if (values.length < 2) return 0;
  const mean = avg(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
};
const erf = (x: number) => {
  const sign = x >= 0 ? 1 : -1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  return sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-abs * abs));
};
const normalCdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
const pValue = (a: number[], b: number[]) => {
  if (a.length < 2 || b.length < 2) return 1;
  const se = Math.sqrt((std(a) ** 2) / a.length + (std(b) ** 2) / b.length);
  if (!se) return 1;
  const t = Math.abs((avg(a) - avg(b)) / se);
  return Math.max(0.001, Math.min(1, 2 * (1 - normalCdf(t))));
};
const delta = (a: number, b: number) => b === 0 ? 0 : ((a - b) / Math.abs(b)) * 100;
const rates = (posts: PostRow[]) => posts.map(post => Number(post.engagement_rate)).filter(Number.isFinite);
const groupHour = (hour: number) => hour < 12 ? 'manhã' : hour < 18 ? 'tarde' : 'noite';
const groupHashtags = (count: number) => count <= 5 ? '0-5' : count <= 15 ? '6-15' : '16+';

function compareGroups(params: {
  insightType: string;
  category: InsightCandidate['category'];
  positiveLabel: string;
  negativeLabel: string;
  positive: PostRow[];
  negative: PostRow[];
  metricLabel: string;
}) {
  const positiveRates = rates(params.positive);
  const negativeRates = rates(params.negative);
  if (positiveRates.length < 10 || negativeRates.length < 10) return null;
  const avgPositive = avg(positiveRates);
  const avgNegative = avg(negativeRates);
  const d = delta(avgPositive, avgNegative);
  const p = pValue(positiveRates, negativeRates);
  if (Math.abs(d) < 20 || p >= 0.1) return null;
  return {
    insight_type: params.insightType,
    category: params.category,
    finding: `${params.positiveLabel} tiveram ${d > 0 ? '+' : ''}${d.toFixed(0)}% ${d > 0 ? 'mais' : 'menos'} ${params.metricLabel} do que ${params.negativeLabel}.`,
    confidence: Number((1 - p).toFixed(2)),
    sample_size: positiveRates.length + negativeRates.length,
    delta_percentage: Number(d.toFixed(1)),
    metadata: {
      positive_label: params.positiveLabel,
      negative_label: params.negativeLabel,
      positive_average: avgPositive,
      negative_average: avgNegative,
      chart: [
        { label: params.positiveLabel, value: avgPositive },
        { label: params.negativeLabel, value: avgNegative },
      ],
      category: params.category,
      p_value: p,
    },
  } satisfies InsightCandidate;
}

function bestGroupInsight(posts: PostRow[], key: string, type: string, category: InsightCandidate['category'], label: string) {
  const buckets = new Map<string, PostRow[]>();
  for (const post of posts) {
    const features = post.ai_features_extracted || {};
    const value = key === 'hour_group' ? groupHour(Number(features.published_at_hour || 0)) : key === 'hashtag_group' ? groupHashtags(Number(features.hashtag_count || 0)) : String(features[key] ?? 'desconhecido');
    buckets.set(value, [...(buckets.get(value) || []), post]);
  }
  const valid = Array.from(buckets.entries()).filter(([, group]) => group.length >= 10);
  if (valid.length < 2) return null;
  const ranked = valid.map(([name, group]) => ({ name, group, value: avg(rates(group)) })).sort((a, b) => b.value - a.value);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const d = delta(best.value, worst.value);
  const p = pValue(rates(best.group), rates(worst.group));
  if (Math.abs(d) < 20 || p >= 0.1) return null;
  return {
    insight_type: type,
    category,
    finding: `${label} “${best.name}” superou “${worst.name}” em ${d.toFixed(0)}%.`,
    confidence: Number((1 - p).toFixed(2)),
    sample_size: best.group.length + worst.group.length,
    delta_percentage: Number(d.toFixed(1)),
    metadata: { category, p_value: p, chart: ranked.map(item => ({ label: item.name, value: item.value })) },
  } satisfies InsightCandidate;
}

function buildInsights(posts: PostRow[]) {
  const insights: InsightCandidate[] = [];
  const push = (candidate: InsightCandidate | null) => { if (candidate) insights.push(candidate); };
  const byFeature = (name: string, value: boolean) => posts.filter(post => Boolean(post.ai_features_extracted?.[name]) === value);

  push(compareGroups({ insightType: 'opening_question', category: 'conteúdo', positiveLabel: 'Posts com pergunta no início', negativeLabel: 'posts sem pergunta no início', positive: byFeature('has_question_in_first_sentence', true), negative: byFeature('has_question_in_first_sentence', false), metricLabel: 'engagement' }));
  push(compareGroups({ insightType: 'starts_with_number', category: 'conteúdo', positiveLabel: 'Posts com número no início', negativeLabel: 'posts sem número no início', positive: byFeature('starts_with_number', true), negative: byFeature('starts_with_number', false), metricLabel: 'engagement' }));
  push(compareGroups({ insightType: 'opening_emoji', category: 'conteúdo', positiveLabel: 'Posts com emoji na primeira linha', negativeLabel: 'posts sem emoji na primeira linha', positive: byFeature('has_emoji_in_first_line', true), negative: byFeature('has_emoji_in_first_line', false), metricLabel: 'engagement' }));
  push(compareGroups({ insightType: 'first_comment', category: 'conteúdo', positiveLabel: 'Posts com primeiro comentário', negativeLabel: 'posts sem primeiro comentário', positive: byFeature('has_first_comment', true), negative: byFeature('has_first_comment', false), metricLabel: 'engagement' }));
  push(compareGroups({ insightType: 'caption_length', category: 'conteúdo', positiveLabel: 'Legendas curtas (<300 caracteres)', negativeLabel: 'legendas longas (>800 caracteres)', positive: posts.filter(post => Number(post.ai_features_extracted?.caption_length) < 300), negative: posts.filter(post => Number(post.ai_features_extracted?.caption_length) > 800), metricLabel: 'engagement' }));
  push(bestGroupInsight(posts, 'hour_group', 'publishing_hour', 'timing', 'Publicar no período'));
  push(bestGroupInsight(posts, 'published_at_day_of_week', 'publishing_day', 'timing', 'Dia da semana'));
  push(bestGroupInsight(posts, 'detected_tone', 'detected_tone', 'tom', 'Tom'));
  push(bestGroupInsight(posts, 'hashtag_group', 'hashtag_count', 'conteúdo', 'Grupo de hashtags'));
  push(bestGroupInsight(posts, 'media_type', 'media_format', 'formato', 'Formato'));
  return insights;
}

async function upsertInsight(client: any, userId: string, network: string, insight: InsightCandidate) {
  const { data: existing } = await client
    .from('account_insights')
    .select('id, dismissed_count, dismissed_until, never_show')
    .eq('user_id', userId)
    .eq('insight_type', insight.insight_type)
    .eq('network', network)
    .maybeSingle();

  const payload = {
    user_id: userId,
    network,
    format: insight.category,
    insight_type: insight.insight_type,
    finding: insight.finding,
    confidence: insight.confidence,
    sample_size: insight.sample_size,
    delta_percentage: insight.delta_percentage,
    p_value: Number((1 - insight.confidence).toFixed(3)),
    metadata: insight.metadata,
    last_updated: new Date().toISOString(),
  };

  if (existing) await client.from('account_insights').update(payload).eq('id', existing.id);
  else await client.from('account_insights').insert(payload);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const cronSecret = Deno.env.get('AI_CRON_SECRET');
    if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
      return json({ success: false, error: 'Não autorizado' }, 401);
    }

    const url = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Backend configuration missing');
    const supabase = createClient(url, serviceKey);

    const { data: prefs, error: prefsError } = await supabase.from('ai_preferences').select('user_id, insights_enabled, muted_insight_types').eq('insights_enabled', true);
    if (prefsError) throw prefsError;
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    let generated = 0;
    const silent: Array<Record<string, unknown>> = [];

    for (const pref of prefs || []) {
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id,user_id,selected_networks,engagement_rate,ai_features_extracted,performance_classification,published_at')
        .eq('user_id', pref.user_id)
        .eq('status', 'published')
        .not('performance_classification', 'is', null)
        .not('ai_features_extracted', 'is', null)
        .gte('published_at', since)
        .order('published_at', { ascending: false });
      if (error) throw error;

      const userPosts = (posts || []) as PostRow[];
      if (userPosts.length < 30) {
        silent.push({ user_id: pref.user_id, classified_posts: userPosts.length });
        continue;
      }

      const networks = Array.from(new Set(userPosts.flatMap(post => post.selected_networks || ['all'])));
      for (const network of networks) {
        const scoped = network === 'all' ? userPosts : userPosts.filter(post => (post.selected_networks || []).includes(network));
        if (scoped.length < 30) continue;
        const mutedTypes = Array.isArray((pref as any).muted_insight_types) ? (pref as any).muted_insight_types : [];
        for (const insight of buildInsights(scoped).filter(item => !mutedTypes.includes(item.insight_type))) {
          await upsertInsight(supabase, pref.user_id, network, insight);
          generated += 1;
        }
      }
    }

    return json({ success: true, generated, silent });
  } catch (error) {
    console.error('[generate-insights]', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }, 500);
  }
});
