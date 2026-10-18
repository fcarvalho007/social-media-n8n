import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useProjetoOpcional } from '@/contexts/ProjetoContext';
import { supabase } from '@/integrations/supabase/client';
import { apiBackend, BACKEND_NUVEM, MODO_HUB_LOCAL } from '@/lib/backendHub';
import { apiSeo } from '@/features/seo/api';
import { ambitoAcervo, type DocumentoAcervo } from '@/features/documentos/modelo';
import { carregarCatalogo } from './catalogo';
import { pesquisarCatalogo, type RespostaPesquisa, type TipoPesquisa } from './pesquisa';
import type { RespostaPercurso } from './modelo';
export function usePesquisaHub(consulta: string, tipo: TipoPesquisa | 'todos' = 'todos', pagina = 1) {
  const { user } = useAuth(), ctx = useProjetoOpcional(), client = useQueryClient();
  const [adiada, setAdiada] = useState('');
  useEffect(() => { const t = setTimeout(() => setAdiada(consulta.trim()), 350); return () => clearTimeout(t); }, [consulta]);
  const pronto = !!user && ctx?.estado === 'pronto' && !!ctx.projetoId && (MODO_HUB_LOCAL || BACKEND_NUVEM);
  const atual = adiada === consulta.trim();
  const q = useQuery({ queryKey: ['pesquisa-hub', user?.id, ctx?.projetoId, adiada, tipo, pagina], enabled: pronto && adiada.length >= 2 && atual, retry: false, staleTime: 30000,
    queryFn: async ({ signal }): Promise<RespostaPesquisa> => {
      if (BACKEND_NUVEM) return apiBackend('/operacao/pesquisa', { consulta: adiada, tipo, pagina }, { projeto: ctx!.projetoId!, signal });
      const c = await client.fetchQuery({ queryKey: ['catalogo-hub-local', user!.id, ctx!.projetoId], staleTime: 60000, queryFn: async () => {
        const { listarAcervo } = await import('@/features/documentos/acervoLocal');
        return carregarCatalogo(supabase, user!.id, ctx!.projetoId!, () => apiSeo('estado'), () => listarAcervo<DocumentoAcervo>('documentos', ambitoAcervo(user!.id, ctx!.projetoId!)));
      } });
      return pesquisarCatalogo(c, adiada, tipo, pagina);
    },
  });
  return { ...q, data: atual && pronto && consulta.trim().length >= 2 ? q.data : undefined, aPesquisar: pronto && consulta.trim().length >= 2 && (!atual || q.isFetching), pronto, repetir: async () => { await client.invalidateQueries({ queryKey: ['catalogo-hub-local', user?.id, ctx?.projetoId] }); return q.refetch(); } };
}
export function usePercursoEditorial() {
  const { user } = useAuth(), ctx = useProjetoOpcional();
  return useQuery({ queryKey: ['percurso-editorial', user?.id, ctx?.projetoId], enabled: !!user && ctx?.estado === 'pronto' && !!ctx.projetoId && (MODO_HUB_LOCAL || BACKEND_NUVEM), queryFn: () => BACKEND_NUVEM ? apiBackend<RespostaPercurso>('/operacao/percurso', {}, { projeto: ctx!.projetoId! }) : apiSeo<RespostaPercurso>('percurso'), retry: false, staleTime: 15000, refetchInterval: 30000 });
}
