import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char));
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function storyEmailHtml(params: { mediaUrl: string; linkUrl: string; stickerText: string; overlayText?: string | null; confirmUrl: string; fallbackUrl: string }) {
  const preview = params.mediaUrl.match(/\.(mp4|mov|webm)(\?|$)/i)
    ? `<p style="margin:0;color:#64748b;font-size:14px;">Vídeo preparado: <a href="${escapeHtml(params.mediaUrl)}" style="color:#2563eb;">abrir ficheiro</a></p>`
    : `<img src="${escapeHtml(params.mediaUrl)}" alt="Pré-visualização da Story" style="width:100%;max-width:260px;border-radius:16px;display:block;margin:0 auto 20px;" />`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Story com Link pronta</title></head><body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;"><tr><td style="padding:28px 28px 10px;"><h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;color:#0f172a;">Story com Link pronta</h1><p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">A tua Story está preparada. Abre no telemóvel, adiciona o link sticker no Instagram e confirma quando estiver publicada.</p></td></tr><tr><td style="padding:18px 28px;text-align:center;">${preview}</td></tr><tr><td style="padding:0 28px 24px;"><div style="background:#f1f5f9;border-radius:14px;padding:16px;margin-bottom:16px;"><p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Link sticker</p><p style="margin:0;font-size:16px;word-break:break-word;"><a href="${escapeHtml(params.linkUrl)}" style="color:#2563eb;">${escapeHtml(params.linkUrl)}</a></p><p style="margin:10px 0 0;color:#334155;font-size:14px;">Texto: <strong>${escapeHtml(params.stickerText)}</strong></p>${params.overlayText ? `<p style="margin:8px 0 0;color:#334155;font-size:14px;">Overlay: ${escapeHtml(params.overlayText)}</p>` : ''}</div><ol style="margin:0 0 22px 20px;padding:0;color:#334155;font-size:15px;line-height:1.7;"><li>Guarda ou partilha a média para Instagram Stories.</li><li>Adiciona o link sticker com o link acima.</li><li>Publica e confirma na app.</li></ol><div style="text-align:center;"><a href="${escapeHtml(params.fallbackUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 22px;font-weight:700;margin:0 6px 10px;">Abrir Instagram</a><a href="${escapeHtml(params.confirmUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 22px;font-weight:700;margin:0 6px 10px;">Já publiquei</a></div></td></tr><tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;"><p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">Lembrete automático do sistema de publicação.</p></td></tr></table></td></tr></table></body></html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return json({ error: 'Canal email não configurado' }, 500);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const resend = new Resend(resendKey);
    const payload = await req.json().catch(() => ({}));
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedCronSecret = Deno.env.get('AI_CRON_SECRET');

    if (payload.test === true) {
      if (!token) return json({ error: 'Sessão obrigatória' }, 401);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user?.email) return json({ error: 'Sessão inválida' }, 401);

      await resend.emails.send({
        from: 'Sistema de Publicação <onboarding@resend.dev>',
        to: [user.email],
        subject: 'Teste de lembrete — Story com Link',
        html: storyEmailHtml({
          mediaUrl: payload.media_url || 'https://placehold.co/720x1280/png',
          linkUrl: payload.link_url || 'https://digitalfc.pt',
          stickerText: payload.sticker_text || 'digitalfc.pt',
          overlayText: 'Teste de lembrete',
          confirmUrl: payload.confirm_url || 'https://social-media-n8n.lovable.app/settings/notifications',
          fallbackUrl: 'https://www.instagram.com/',
        }),
      });

      await supabase.from('user_notification_preferences').upsert({ user_id: user.id, reminder_channel: 'email', email_tested_at: new Date().toISOString() });
      return json({ ok: true, sent: 1 });
    }

    if (!expectedCronSecret || cronSecret !== expectedCronSecret) return json({ error: 'Não autorizado' }, 401);

    const { data: stories, error: storiesError } = await supabase
      .from('story_link_publications')
      .select('id,user_id,media_url,media_type,link_url,sticker_text,overlay_text,caption,reminder_channel')
      .eq('status', 'ready')
      .lte('reminder_scheduled_at', new Date().toISOString())
      .limit(20);
    if (storiesError) throw storiesError;

    let sent = 0;
    for (const story of stories ?? []) {
      try {
        if (story.reminder_channel && story.reminder_channel !== 'email') {
          await supabase.from('story_link_publications').update({ last_error: `Canal ${story.reminder_channel} ainda não configurado nesta fase.` }).eq('id', story.id);
          continue;
        }

        const { data: profile } = await supabase.from('profiles').select('email').eq('id', story.user_id).maybeSingle();
        if (!profile?.email) throw new Error('Email do utilizador não encontrado');

        const tokenValue = randomToken();
        const tokenHash = await sha256(tokenValue);
        const confirmUrl = `https://social-media-n8n.lovable.app/stories/confirm?id=${story.id}&token=${tokenValue}`;
        const stickerText = story.sticker_text || new URL(story.link_url).hostname.replace(/^www\./, '');

        await supabase.from('story_link_publications').update({
          confirmation_token_hash: tokenHash,
          confirmation_token_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        }).eq('id', story.id);

        await resend.emails.send({
          from: 'Sistema de Publicação <onboarding@resend.dev>',
          to: [profile.email],
          subject: 'A tua Story com Link está pronta para publicar',
          html: storyEmailHtml({
            mediaUrl: story.media_url,
            linkUrl: story.link_url,
            stickerText,
            overlayText: story.overlay_text,
            confirmUrl,
            fallbackUrl: 'https://www.instagram.com/',
          }),
        });

        await supabase.from('story_link_publications').update({
          reminder_sent_at: new Date().toISOString(),
          status: 'reminder_sent',
          last_error: null,
        }).eq('id', story.id);
        sent += 1;
      } catch (error) {
        await supabase.from('story_link_publications').update({ last_error: error instanceof Error ? error.message : 'Erro ao enviar lembrete' }).eq('id', story.id);
      }
    }

    return json({ ok: true, processed: stories?.length ?? 0, sent });
  } catch (error) {
    console.error('[send_story_reminder]', error);
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado' }, 500);
  }
});
