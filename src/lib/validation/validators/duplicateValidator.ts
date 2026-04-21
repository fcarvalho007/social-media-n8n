import { ValidatorContext, ValidationIssue } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { getNetworkFromFormat } from '@/types/social';

/**
 * Replaces the legacy 24h blocking guard in usePublishWithProgress with an
 * informational signal in the validation panel. Backend keeps the ZWSP retry
 * fallback, so publication is never blocked here.
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
    const { data } = await supabase
      .from('publication_attempts')
      .select('id, attempted_at, posts!inner(caption, status)')
      .eq('platform', 'instagram')
      .eq('status', 'success')
      .gte('attempted_at', dayAgo)
      .limit(20);

    const dup = (data || []).find((row: any) => {
      const otherCap = (row?.posts?.caption || '').trim().substring(0, 100);
      return otherCap && otherCap === fingerprint;
    });

    if (!dup) return [];

    return [
      {
        id: 'duplicate:instagram:24h',
        severity: 'info',
        category: 'duplicate',
        platform: 'instagram',
        title: 'Conteúdo similar publicado nas últimas 24h',
        description:
          'O Instagram bloqueia legendas idênticas. O sistema vai adicionar automaticamente um carácter invisível antes de tentar de novo. Se preferires, edita ligeiramente o texto.',
        dismissable: true,
      },
    ];
  } catch (err) {
    console.warn('[duplicateValidator] query failed', err);
    return [];
  }
}
