import type { InstagramAnalyticsItem } from '@/hooks/useInstagramAnalytics';

export function filtrarPeriodoSocial<T extends { posted_at: string | null }>(itens: T[], dias: string, agora = Date.now()) {
  if (dias === 'all') return itens;
  const limite = agora - Number(dias) * 86_400_000;
  return itens.filter(item => {
    const data = Date.parse(item.posted_at ?? '');
    return Number.isFinite(data) && data >= limite && data <= agora;
  });
}

export const formatoSocial = (tipo: string | null) => /^(sidecar|carrossel|carousel|album)$/i.test(tipo ?? '') ? 'Carrossel' : /^(video|reel)$/i.test(tipo ?? '') ? 'Vídeo' : /^image$/i.test(tipo ?? '') ? 'Imagem' : 'Outro';
const valor = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;
export const interacoesRegistadas = (p: Pick<InstagramAnalyticsItem, 'likes_count' | 'comments_count'>) => valor(p.likes_count) + valor(p.comments_count);

/** Descriptive sample statistics, never a ranking score or a causal recommendation. */
export function resumirContasSociais(posts: InstagramAnalyticsItem[]) {
  const contas = new Map<string, InstagramAnalyticsItem[]>();
  for (const post of posts) {
    const nome = post.owner_username?.replace(/^@/, '').trim().toLowerCase();
    if (nome) contas.set(nome, [...(contas.get(nome) ?? []), post]);
  }
  return [...contas].map(([username, itens]) => {
    const datas = itens.map(p => Date.parse(p.posted_at ?? '')).filter(Number.isFinite);
    const total = itens.reduce((s,p) => s + interacoesRegistadas(p), 0);
    return { username, itens, quantidade: itens.length, total, media: total / itens.length,
      primeira: datas.length ? Math.min(...datas) : null, ultima: datas.length ? Math.max(...datas) : null };
  }).sort((a,b) => a.username.localeCompare(b.username));
}
