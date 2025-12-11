import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  post_id: string;
  error_message: string;
  platform: string;
  format: string;
  recovery_token: string;
  user_email: string;
  post_caption?: string;
  media_count?: number;
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    const { post_id, error_message, platform, format, recovery_token, user_email, post_caption, media_count } = payload;

    console.log(`[notify-publication-failure] Sending notification for post ${post_id}`);
    console.log(`[notify-publication-failure] Platform: ${platform}, Format: ${format}`);
    console.log(`[notify-publication-failure] Error: ${error_message}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // Build recovery URL - use the app URL from Supabase
    const appUrl = supabaseUrl.replace('.supabase.co', '.lovable.app').replace('https://vtmrimrrppuclciolzuw', 'https://vtmrimrrppuclciolzuw');
    
    // For now, use a generic app URL pattern
    const recoveryUrl = `https://preview--vtmrimrrppuclciolzuw.lovable.app/recovery/${recovery_token}`;
    
    const platformLabels: Record<string, string> = {
      instagram: 'Instagram',
      linkedin: 'LinkedIn',
      youtube: 'YouTube',
      tiktok: 'TikTok',
      facebook: 'Facebook',
    };

    const formatLabels: Record<string, string> = {
      instagram_carousel: 'Carrossel',
      instagram_image: 'Imagem',
      instagram_stories: 'Story',
      instagram_reel: 'Reel',
      linkedin_post: 'Post',
      linkedin_document: 'Documento PDF',
      youtube_shorts: 'Short',
      youtube_video: 'Vídeo',
      tiktok_video: 'Vídeo',
      facebook_image: 'Imagem',
      facebook_stories: 'Story',
      facebook_reel: 'Reel',
    };

    const platformLabel = platformLabels[platform] || platform;
    const formatLabel = formatLabels[format] || format;

    // Truncate caption for email preview
    const captionPreview = post_caption 
      ? (post_caption.length > 100 ? post_caption.substring(0, 100) + '...' : post_caption)
      : 'Sem legenda';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Falha na Publicação</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 12px 12px 0 0;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <span style="font-size: 32px;">⚠️</span>
                  </td>
                  <td style="padding-left: 16px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                      Falha na Publicação
                    </h1>
                    <p style="margin: 4px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                      ${platformLabel} • ${formatLabel}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                A publicação para <strong>${platformLabel}</strong> falhou. Podes descarregar os ficheiros e publicar manualmente.
              </p>

              <!-- Error Box -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #991b1b; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                  Erro
                </p>
                <p style="margin: 0; color: #b91c1c; font-size: 14px; font-family: monospace; word-break: break-word;">
                  ${error_message}
                </p>
              </div>

              <!-- Post Preview -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                  Conteúdo
                </p>
                <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">
                  ${captionPreview}
                </p>
                ${media_count ? `<p style="margin: 0; color: #6b7280; font-size: 13px;">📎 ${media_count} ficheiro(s) anexado(s)</p>` : ''}
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${recoveryUrl}" 
                       style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                      📥 Recuperar Publicação
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
                Ou copia este link: <a href="${recoveryUrl}" style="color: #3b82f6;">${recoveryUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Este email foi enviado automaticamente pelo sistema de publicação.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: 'Sistema de Publicação <onboarding@resend.dev>',
      to: [user_email],
      subject: `⚠️ Falha na publicação: ${platformLabel} - ${formatLabel}`,
      html: emailHtml,
    });

    console.log(`[notify-publication-failure] Email sent successfully:`, emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[notify-publication-failure] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send notification'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
