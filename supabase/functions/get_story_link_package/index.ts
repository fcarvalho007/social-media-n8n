import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const payload = await req.json().catch(() => ({}));
    const storyId = payload.story_id;
    const token = typeof payload.token === 'string' ? payload.token : '';
    if (!storyId || typeof storyId !== 'string') return json({ error: 'Story inválida' }, 400);

    const { data: story, error } = await admin
      .from('story_link_publications')
      .select('id,user_id,media_url,media_type,link_url,sticker_text,overlay_text,status,confirmation_token_hash,confirmation_token_expires_at')
      .eq('id', storyId)
      .maybeSingle();
    if (error) throw error;
    if (!story) return json({ error: 'Pacote não encontrado' }, 404);

    let allowed = false;
    if (token) {
      const hash = await sha256(token);
      const expiresAt = story.confirmation_token_expires_at ? new Date(story.confirmation_token_expires_at).getTime() : 0;
      allowed = story.confirmation_token_hash === hash && (!expiresAt || expiresAt > Date.now());
    } else {
      const authHeader = req.headers.get('Authorization') ?? '';
      const jwt = authHeader.replace('Bearer ', '');
      if (jwt) {
        const { data: { user } } = await authClient.auth.getUser(jwt);
        allowed = !!user && user.id === story.user_id;
      }
    }

    if (!allowed) return json({ error: 'Sem acesso a este pacote' }, 403);

    return json({
      id: story.id,
      media_url: story.media_url,
      media_type: story.media_type,
      link_url: story.link_url,
      sticker_text: story.sticker_text,
      overlay_text: story.overlay_text,
      status: story.status,
      token_access: !!token,
    });
  } catch (error) {
    console.error('[get_story_link_package]', error);
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado' }, 500);
  }
});
