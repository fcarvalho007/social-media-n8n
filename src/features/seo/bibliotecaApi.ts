import { useQuery } from '@tanstack/react-query';
import { useProjetoOpcional } from '@/contexts/ProjetoContext';
import { apiSeo } from './api';
import type { PesquisaGuardada } from './contratos';
export type BibliotecaSeo = { resultados: PesquisaGuardada[]; indisponiveis: string[] };
export function useBibliotecaSeo() { const ctx=useProjetoOpcional(); return useQuery({queryKey:['seo-biblioteca',ctx?.projetoId], queryFn:()=>apiSeo<BibliotecaSeo>('biblioteca-pesquisas'),staleTime:15000,retry:false}); }
