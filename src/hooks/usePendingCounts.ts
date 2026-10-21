import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PendingCounts { stories: number; carousels: number; posts: number; total: number }
const VAZIO: PendingCounts = {stories:0,carousels:0,posts:0,total:0};
const chave = (userId: string | null) => ['pending-counts',userId] as const;

async function carregarContagens(): Promise<PendingCounts> {
  // The approval list is team-wide under RLS. Count the same scope; never narrow it to its author.
  const resultados = await Promise.all([
    supabase.from('stories').select('id',{count:'exact',head:true}).eq('status','pending'),
    supabase.from('posts').select('id',{count:'exact',head:true}).eq('status','pending').eq('content_type','carousel'),
    supabase.from('posts').select('id',{count:'exact',head:true}).eq('status','pending'),
  ]);
  for (const r of resultados) {
    if (r.error) throw r.error;
    if (typeof r.count !== 'number') throw new Error('Não foi possível confirmar a contagem.');
  }
  const [stories,carousels,todosPosts] = resultados.map(r => r.count!);
  // A missing legacy content_type is a post too (SQL neq would silently exclude NULL).
  const posts = todosPosts-carousels;
  if (posts < 0) throw new Error('Os conteúdos mudaram durante a contagem. Atualiza novamente.');
  return {stories,carousels,posts,total:stories+carousels+posts};
}

// Sidebar and approval screen share a single subscription as well as the query cache.
const observadores = new WeakMap<QueryClient,Map<string,{referencias:number;fechar:()=>void}>>();
function observar(client: QueryClient, userId: string) {
  let mapa = observadores.get(client);
  if (!mapa) {mapa = new Map();observadores.set(client,mapa);}
  let observador = mapa.get(userId);
  if (!observador) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const atualizar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {void client.invalidateQueries({queryKey:chave(userId)},{cancelRefetch:false});},200);
    };
    // No status filter: UPDATE away from pending and DELETE must also lower the badge.
    const canal = supabase.channel(`pending-counts:${userId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'stories'},atualizar)
      .on('postgres_changes',{event:'*',schema:'public',table:'posts'},atualizar)
      .subscribe(status => {if(status === 'SUBSCRIBED') atualizar();});
    observador = {referencias:0,fechar:()=>{clearTimeout(timer);void supabase.removeChannel(canal);}};
    mapa.set(userId,observador);
  }
  observador.referencias++;
  return () => {if(--observador.referencias === 0){observador.fechar();mapa.delete(userId);}};
}

export function usePendingCounts() {
  const {user} = useAuth();
  const userId = user?.id ?? null;
  const client = useQueryClient();
  const q = useQuery({queryKey:chave(userId),queryFn:carregarContagens,enabled:!!userId,retry:false,
    staleTime:30_000,refetchInterval:60_000,refetchOnWindowFocus:true});
  useEffect(() => userId ? observar(client,userId) : undefined,[client,userId]);
  return {counts:q.data ?? VAZIO,loading:q.isLoading,error:q.error,refetch:q.refetch};
}
