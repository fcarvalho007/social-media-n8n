import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LegadoN8n } from '@/components/ActionButtons';
import { ModeSelector } from '@/components/ModeSelector';
import { PostCard } from '@/components/PostCard';
import { StoryCard } from '@/components/StoryCard';
import { PostCardSkeleton } from '@/components/PostCardSkeleton';
import { StoryCardSkeleton } from '@/components/StoryCardSkeleton';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Search, 
  Inbox, 
  LayoutGrid, 
  Video, 
  Image as ImageIcon, 
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { usePendingCounts } from '@/hooks/usePendingCounts';
import { IniciadosSection } from '@/components/drafts/IniciadosSection';

const Pending = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedStatus, setLoadedStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const requestVersion = useRef(0);
  const deletingKeys = useRef(new Set<string>());
  const deletedPosts = useRef(new Set<string>());
  const deletedStories = useRef(new Set<string>());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('pending');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'approve';
  const { counts, loading: contagensACarregar, error: erroContagens, refetch: recarregarContagens } = usePendingCounts();
  const isMobile = useIsMobile();
  const invalidateRequests = useCallback(() => { requestVersion.current++; }, []);

  const fetchAll = useCallback(async () => {
    if (activeTab === 'create') return;
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError(false);
    const queryForStatus = (table: 'posts' | 'stories') => {
      let query = supabase.from(table).select('*');
      if (activeStatus === 'approved') {
        query = query.in('status', ['approved', 'published']).is('scheduled_date', null);
      } else if (activeStatus === 'scheduled') {
        query = query.eq('status', 'approved').not('scheduled_date', 'is', null);
      } else {
        query = query.eq('status', activeStatus);
      }

      const orderColumn = activeStatus === 'approved' ? 'reviewed_at' : 'created_at';
      return query.order(orderColumn, { ascending: false });
    };
    try {
      // Both lists belong to the same status and must finish before becoming actionable.
      const results = await Promise.allSettled([queryForStatus('posts'), queryForStatus('stories')]);
      if (version !== requestVersion.current) return;
      const failure = results.find(result => result.status === 'rejected' || result.value.error);
      if (failure) {
        throw failure.status === 'rejected' ? failure.reason : failure.value.error;
      }
      const [postsResult, storiesResult] = results;
      if (postsResult.status === 'fulfilled' && storiesResult.status === 'fulfilled') {
        // A response already in flight must never restore a successfully deleted card.
        setPosts((postsResult.value.data || []).filter(post => !deletedPosts.current.has(post.id)));
        setStories((storiesResult.value.data || []).filter(story => !deletedStories.current.has(story.id)));
      }
    } catch (error) {
      if (version !== requestVersion.current) return;
      logger.error('Erro ao carregar conteúdo para aprovação', error);
      setLoadError(true);
    } finally {
      if (version === requestVersion.current) {
        setLoadedStatus(activeStatus);
        setLoading(false);
      }
    }
  }, [activeStatus, activeTab]);

  const pullToRefresh = usePullToRefresh({
    onRefresh: fetchAll,
    disabled: !isMobile || activeTab === 'create',
  });

  const beginDelete = (key: string) => {
    if (deletingKeys.current.has(key)) return false;
    deletingKeys.current.add(key);
    setDeleting(new Set(deletingKeys.current));
    return true;
  };

  const finishDelete = (key: string) => {
    deletingKeys.current.delete(key);
    setDeleting(new Set(deletingKeys.current));
  };

  const handleDelete = async (postId: string) => {
    const key = `post-${postId}`;
    if (!beginDelete(key)) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .select('id')
        .single();

      if (error) throw error;
      if (data?.id !== postId) throw new Error('A eliminação da publicação não foi confirmada');

      deletedPosts.current.add(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Publicação eliminada com sucesso');
    } catch (error) {
      logger.error('Erro ao eliminar publicação', error);
      toast.error('Falha ao eliminar publicação');
    } finally {
      finishDelete(key);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    const key = `story-${storyId}`;
    if (!beginDelete(key)) return;
    try {
      const { data, error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .select('id')
        .single();

      if (error) throw error;
      if (data?.id !== storyId) throw new Error('A eliminação do Story não foi confirmada');

      deletedStories.current.add(storyId);
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      toast.success('Story eliminado com sucesso');
    } catch (error) {
      logger.error('Erro ao eliminar story', error);
      toast.error('Falha ao eliminar story');
    } finally {
      finishDelete(key);
    }
  };

  useEffect(() => {
    // Only fetch data when on the approve tab
    if (activeTab === 'create') {
      invalidateRequests();
      setLoadedStatus(null);
      setLoading(false);
      return;
    }

    let active = true;
    const refreshIfActive = () => { if (active) void fetchAll(); };
    refreshIfActive();

    const postsChannel = supabase
      .channel('posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        logger.debug('Posts table changed, refetching...');
        refreshIfActive();
      })
      .subscribe();

    const storiesChannel = supabase
      .channel('stories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        logger.debug('Stories table changed, refetching...');
        refreshIfActive();
      })
      .subscribe();

    return () => {
      active = false;
      invalidateRequests();
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(storiesChannel);
    };
  }, [activeTab, fetchAll, invalidateRequests]);

  const isLoadingCurrentStatus = loading || loadedStatus !== activeStatus;

  const filteredPosts = posts.filter((post) => {
    const matchesSearch = (post.tema || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.caption || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesContentType = contentTypeFilter === 'all' || post.content_type === contentTypeFilter;
    return matchesSearch && matchesContentType;
  });

  const filteredStories = stories.filter((story) => {
    const matchesSearch = (story.tema?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (story.caption?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (story.titulo_slide?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesContentType = contentTypeFilter === 'all' || contentTypeFilter === 'stories';
    return matchesSearch && matchesContentType;
  });

  // Combine and sort all content by created_at (most recent first)
  const allContent = [
    ...filteredPosts.map(post => ({ type: 'post', data: post, created_at: post.created_at })),
    ...filteredStories.map(story => ({ type: 'story', data: story, created_at: story.created_at }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const statusConfig = {
    pending: { 
      label: 'Pendentes', 
      icon: Clock, 
      color: 'bg-warning-light text-warning border-warning/20', 
      count: contagensACarregar || erroContagens ? 0 : counts.total,
      breakdown: `${counts.stories} Stories • ${counts.carousels} Carrosséis • ${counts.posts} Posts`
    },
    approved: { label: 'Aprovados', icon: CheckCircle2, color: 'bg-success-light text-success border-success/20', count: 0, breakdown: '' },
    scheduled: { label: 'Agendados', icon: Clock, color: 'bg-primary-light text-primary border-primary/20', count: 0, breakdown: '' },
    rejected: { label: 'Rejeitados', icon: XCircle, color: 'bg-destructive-light text-destructive border-destructive/20', count: 0, breakdown: '' },
  };

  const contentTypes = [
    { id: 'all', label: 'Todos', icon: null },
    { id: 'carousel', label: 'Carrossel', icon: LayoutGrid },
    { id: 'stories', label: 'Stories', icon: Video },
    { id: 'post', label: 'Post', icon: ImageIcon },
  ];

  return (
    <>
      <PullToRefreshIndicator
        pullDistance={pullToRefresh.pullDistance}
        isRefreshing={pullToRefresh.isRefreshing}
        isPulling={pullToRefresh.isPulling}
      />
      <div className="space-y-4 sm:space-y-6 bg-gradient-to-br from-background via-background to-muted/10" role="region" aria-label="Conteúdo de aprovação e criação">
          {activeTab === 'create' ? (
            /* Create Tab */
            <div className="space-y-6 w-full" role="region" aria-label="Área de criação de conteúdo">
              <div className="rounded-md border border-border bg-card p-4 shadow-sm sm:p-6">
                  <ModeSelector 
                    onModeSelect={(mode) => {
                      if (mode === 'manual') {
                        navigate('/manual-create');
                      }
                    }}
                  />
                  <div className="mx-auto mt-4 max-w-6xl"><LegadoN8n /></div>
              </div>
              <IniciadosSection />
            </div>
          ) : (
            /* Approve Tab */
            <div className="space-y-6 w-full">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight">Para aprovar</h1>
                <p className="text-sm text-muted-foreground">Revê o conteúdo e acompanha cada estado antes da publicação.</p>
              </div>
              {erroContagens && <Alert><AlertCircle aria-hidden /><AlertTitle>Contagem de pendentes indisponível</AlertTitle><AlertDescription><p>A lista pode continuar a ser consultada. Tenta atualizar a contagem.</p><Button variant="outline" className="mt-3 min-h-11" onClick={() => void recarregarContagens()}>Atualizar contagem</Button></AlertDescription></Alert>}
              {/* Filters Section - Agrupada em card */}
              <div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border-2 border-border shadow-lg w-full max-w-full overflow-hidden">
                {/* Content Type Filter - Mobile optimized */}
                <div className="mb-3 sm:mb-5">
                  <h3 className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 sm:mb-3">
                    Filtrar por Tipo
                  </h3>
                  <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
                    <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                      {contentTypes.map((type) => (
                        <Button
                          key={type.id}
                          onClick={() => setContentTypeFilter(type.id)}
                          aria-pressed={contentTypeFilter === type.id}
                          variant="outline"
                          size="sm"
                          className={cn(
                            'h-10 min-h-[44px] px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold transition-all duration-200 border-2 rounded-xl touch-target snap-center flex-shrink-0 whitespace-nowrap active:scale-95',
                            contentTypeFilter === type.id
                              ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                              : 'bg-background hover:bg-accent border-border hover:border-primary/50 hover:shadow-md'
                          )}
                        >
                          {type.icon && <type.icon className="mr-1 sm:mr-1.5 h-5 w-5 flex-shrink-0" />}
                          <span className="truncate">{type.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Tabs + Search */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Estado da Publicação
                  </h3>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
                      <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <Button
                            key={key}
                            onClick={() => setActiveStatus(key)}
                            aria-pressed={activeStatus === key}
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'h-10 min-h-[44px] px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 border-2 whitespace-nowrap relative snap-center flex-shrink-0 active:scale-95',
                              activeStatus === key
                                ? config.color + ' shadow-lg'
                                : 'bg-card border-border hover:bg-accent hover:shadow-md'
                            )}
                            title={key === 'pending' && config.count > 0 ? config.breakdown : undefined}
                          >
                            <config.icon className="mr-1 sm:mr-1.5 h-4 w-4 sm:h-5 sm:w-5" />
                            {config.label}
                            {key === 'pending' && config.count > 0 && (
                              <Badge 
                                variant="secondary" 
                                className="ml-1 sm:ml-1.5 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs font-bold bg-warning text-warning-foreground"
                              >
                                {config.count}
                              </Badge>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 lg:max-w-md">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 sm:left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Procurar..."
                          aria-label="Procurar conteúdo para aprovação"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 sm:pl-10 h-10 bg-background border-2 border-border rounded-xl text-sm focus:border-primary transition-all shadow-sm"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchAll()}
                        disabled={isLoadingCurrentStatus}
                        aria-label="Recarregar lista"
                        className="h-11 w-11 min-w-[44px] rounded-xl border-2 border-border hover:bg-accent hover:border-primary/50 transition-all shadow-sm"
                        title="Recarregar lista"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingCurrentStatus ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Grid - Mobile optimized spacing */}
              {isLoadingCurrentStatus ? (
                <div role="status" aria-label="A carregar conteúdo para aprovação" className="grid gap-2 sm:gap-3 md:gap-4 lg:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    contentTypeFilter === 'stories' || (contentTypeFilter === 'all' && i % 2 === 0) ? (
                      <StoryCardSkeleton key={i} />
                    ) : (
                      <PostCardSkeleton key={i} />
                    )
                  ))}
                </div>
              ) : loadError ? (
                <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                    <div className="space-y-2">
                      <h3 className="font-semibold">Não foi possível carregar o conteúdo para aprovação</h3>
                      <p className="max-w-prose text-sm text-muted-foreground">A lista pode estar incompleta. Tente de novo para ver as publicações e os Stories deste estado.</p>
                      <Button variant="outline" onClick={() => fetchAll()} className="min-h-11">Tentar de novo</Button>
                    </div>
                  </div>
                </div>
              ) : allContent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 text-center bg-card rounded-xl sm:rounded-2xl border-2 border-dashed border-border shadow-lg">
                  <Inbox className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-muted-foreground/50 mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-bold mb-2 text-foreground px-4">
                    Nenhum conteúdo encontrado
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-4">
                    {searchQuery
                      ? 'Nenhum conteúdo corresponde aos critérios de pesquisa'
                      : `Não existe conteúdo ${activeStatus === 'pending' ? 'pendente' : activeStatus === 'approved' ? 'aprovado' : activeStatus === 'scheduled' ? 'agendado' : 'rejeitado'} neste momento`}
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-hidden">
                  <div className="grid gap-2 sm:gap-3 md:gap-4 lg:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-scale-in">
                    {allContent.map((item, index) => (
                      <div
                        key={`${item.type}-${item.data.id}`}
                        aria-busy={deleting.has(`${item.type}-${item.data.id}`)}
                        onClickCapture={(event) => {
                          if (deletingKeys.current.has(`${item.type}-${item.data.id}`)) {
                            event.preventDefault();
                            event.stopPropagation();
                          }
                        }}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className="animate-fade-in w-full max-w-[480px] mx-auto sm:max-w-none"
                      >
                        {item.type === 'post' ? (
                          <PostCard
                            post={item.data}
                            onClick={() => navigate(`/review/${item.data.id}`)}
                            onDelete={handleDelete}
                          />
                        ) : (
                          <StoryCard
                            story={item.data}
                            onClick={() => navigate(`/review-story/${item.data.id}`)}
                            onDelete={handleDeleteStory}
                          />
                        )}
                        {deleting.has(`${item.type}-${item.data.id}`) && (
                          <p role="status" className="mt-2 text-center text-sm text-muted-foreground">A eliminar…</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    </>
  );
};

export default Pending;
