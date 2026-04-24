import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Platform = 'ios' | 'android' | 'web';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Sessão obrigatória' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Sessão inválida' }, 401);

    const payload = await req.json().catch(() => ({}));
    const mediaUrl = payload.media_url;
    const platform = (payload.platform ?? 'web') as Platform;

    if (!isValidUrl(mediaUrl)) return json({ error: 'URL de média inválido' }, 400);
    if (!['ios', 'android', 'web'].includes(platform)) return json({ error: 'Plataforma inválida' }, 400);

    const fallbackWebUrl = 'https://www.instagram.com/';
    const appOrigin = req.headers.get('origin') || 'https://social-media-n8n.lovable.app';
    const shareSheetUrl = `${appOrigin}/manual-create?storyMedia=${encodeURIComponent(mediaUrl)}`;

    const instructions = [
      'Abre o link no telemóvel.',
      'Partilha a imagem ou vídeo para Stories no Instagram.',
      'Adiciona o link sticker manualmente.',
      'Volta à app e confirma que publicaste.',
    ];

    const instagramDeepLink = platform === 'android'
      ? `intent://story-camera#Intent;package=com.instagram.android;scheme=instagram;end`
      : platform === 'ios'
        ? 'instagram-stories://share'
        : fallbackWebUrl;

    return json({
      instagram_deep_link: instagramDeepLink,
      share_sheet_url: shareSheetUrl,
      fallback_web_url: fallbackWebUrl,
      mobile_share_url: shareSheetUrl,
      instructions_ordered: instructions,
    });
  } catch (error) {
    console.error('[generate_story_deeplink]', error);
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado' }, 500);
  }
});
