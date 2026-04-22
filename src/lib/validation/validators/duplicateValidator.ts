import { ValidatorContext, ValidationIssue } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { getNetworkFromFormat } from '@/types/social';

/**
 * Detects when the current Instagram caption matches a recent publication
 * (success, scheduled, pending OR failed) within the last 24h. Surfaces a
 * warning with an inline auto-fix that appends an invisible variation,
 * preventing the Getlate 409 "exact content" rejection before it reaches
 * the backend.
 *
 * Severity rules:
 *   • Match against a successful publication → **warning** (publication still
 *     allowed, but user must consciously dismiss / auto-fix).
 *   • Match against a failed/pending one → **info** (lighter signal).
 */
export async function duplicateValidator(
  ctx: ValidatorContext,
): Promise<ValidationIssue[]> {
  const trimmed = ctx.caption.trim();
  if (trimmed.length < 30) return [];

  const networks = new Set(ctx.selectedFormats.map(f => getNetworkFromFormat(f)));
  if (!networks.has('instagram')) return [];

  if (ctx.signal?.aborted) return [];

  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fingerprint = trimmed.substring(0, 100);
    // Match against ALL recent attempts including failed — failed attempts also
    // exhausted Getlate's 24h fingerprint window and would re-trigger 409.
    const { data } = await supabase
      .from('publication_attempts')
      .select('id, status, attempted_at, posts!inner(caption, status)')
      .eq('platform', 'instagram')
      .in('status', ['success', 'pending', 'scheduled', 'failed'])
      .gte('attempted_at', dayAgo)
      .limit(50);

    const dup = (data || []).find((row: any) => {
      const otherCap = (row?.posts?.caption || '').trim().substring(0, 100);
      return otherCap && otherCap === fingerprint;
    });

    if (!dup) return [];

    const matchedSuccess = dup.status === 'success';

    // Auto-fix appends a newline + a randomly chosen subtle variation marker.
    // Keeps the visible caption clean while breaking Getlate's exact-match hash.
    const VARIATION_MARKERS = ['✨', '🔹', '📍', '·'];
    const fixAction = ctx.fixHelpers?.setCaption
      ? async () => {
          const marker =
            VARIATION_MARKERS[Math.floor(Math.random() * VARIATION_MARKERS.length)];
          ctx.fixHelpers!.setCaption!(`${ctx.caption.replace(/\s+$/, '')}\n${marker}`);
        }
      : undefined;

    return [
      {
        id: matchedSuccess
          ? 'duplicate:instagram:success-24h'
          : 'duplicate:instagram:recent-24h',
        severity: matchedSuccess ? 'warning' : 'info',
        category: 'duplicate',
        platform: 'instagram',
        title: matchedSuccess
          ? 'Legenda igual a publicação recente (24h)'
          : 'Legenda parecida com tentativa recente',
        description: matchedSuccess
          ? 'O Instagram via Getlate bloqueia legendas idênticas durante 24h. O sistema vai tentar contornar com um carácter invisível, mas para garantir sucesso varia ligeiramente o texto.'
          : 'Existe uma publicação recente com legenda idêntica. Considera variar o texto para evitar bloqueio.',
        dismissable: true,
        autoFixable: !!fixAction,
        fixAction,
        fixLabel: 'Adicionar variação subtil',
      },
    ];
  } catch (err) {
    console.warn('[duplicateValidator] query failed', err);
    return [];
  }
}
