import { useQuery } from '@tanstack/react-query';
import { useProjetoOpcional } from '@/contexts/ProjetoContext';
import { apiSeo } from './api';
import type { ImagemGuardada } from './artigoCompleto';
export function useImagensArtigo(){const ctx=useProjetoOpcional();return useQuery({queryKey:['imagens-artigos',ctx?.projetoId],queryFn:()=>apiSeo<ImagemGuardada[]>('imagens-listar'),retry:false,staleTime:60000,refetchInterval:600000});}

export function useImagemArtigo(id?:string){const ctx=useProjetoOpcional();return useQuery({queryKey:['imagem-artigo',ctx?.projetoId,id],enabled:!!id,queryFn:()=>apiSeo<ImagemGuardada>('imagem-detalhe',{id}),retry:false,staleTime:60000,refetchInterval:600000});}
