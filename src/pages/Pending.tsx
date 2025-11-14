import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ActionButtons } from '@/components/ActionButtons';
import { ModeSelector } from '@/components/ModeSelector';
import { ModeBadge } from '@/components/ModeBadge';
import { ModeChangeConfirmDialog } from '@/components/ModeChangeConfirmDialog';
import { PostCard } from '@/components/PostCard';
import { StoryCard } from '@/components/StoryCard';
import { PostCardSkeleton } from '@/components/PostCardSkeleton';
import { StoryCardSkeleton } from '@/components/StoryCardSkeleton';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Inbox, 
  LayoutGrid, 
  Video, 
  Image as ImageIcon, 
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { usePendingCounts } from '@/hooks/usePendingCounts';

const Pending = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('pending');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [creationMode, setCreationMode] = useState<'manual' | 'ia' | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(true);
  const [showModeChangeDialog, setShowModeChangeDialog] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'approve';
  const { counts } = usePendingCounts();

  // Check for preferred mode on mount
  useEffect(() => {
    if (activeTab === 'create') {
      const preferredMode = localStorage.getItem('preferredCreationMode') as 'manual' | 'ia' | null;
      if (preferredMode) {
        setCreationMode(preferredMode);
        setShowModeSelector(false);
      }
    }
  }, [activeTab]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase.from('posts').select('*');

      if (activeStatus === 'approved') {
        query = query.in('status', ['approved', 'published']).is('scheduled_date', null);
      } else if (activeStatus === 'scheduled') {
        query = query.eq('status', 'approved').not('scheduled_date', 'is', null);
      } else {
        query = query.eq('status', activeStatus);
      }

      // Ordenar por reviewed_at se aprovado, ou created_at se pendente
      const orderColumn = activeStatus === 'approved' ? 'reviewed_at' : 'created_at';
      const { data, error } = await query.order(orderColumn, { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      logger.error('Erro ao carregar publicações', error);
      toast.error('Falha ao carregar publicações');
    } finally {
      setLoading(false);
    }
  };

  const fetchStories = async () => {
    try {
      let query = supabase.from('stories').select('*');

      if (activeStatus === 'approved') {
        query = query.in('status', ['approved', 'published']).is('scheduled_date', null);
      } else if (activeStatus === 'scheduled') {
        query = query.eq('status', 'approved').not('scheduled_date', 'is', null);
      } else {
        query = query.eq('status', activeStatus);
      }

      // Ordenar por reviewed_at se aprovado, ou created_at se pendente
      const orderColumn = activeStatus === 'approved' ? 'reviewed_at' : 'created_at';
      const { data, error } = await query.order(orderColumn, { ascending: false });

      if (error) throw error;

      setStories(data || []);
    } catch (error) {
      logger.error('Erro ao carregar stories', error);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchPosts(), fetchStories()]);
    setLoading(false);
  };

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Publicação eliminada com sucesso');
    } catch (error) {
      logger.error('Erro ao eliminar publicação', error);
      toast.error('Falha ao eliminar publicação');
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;

      setStories((prev) => prev.filter((s) => s.id !== storyId));
      toast.success('Story eliminado com sucesso');
    } catch (error) {
      logger.error('Erro ao eliminar story', error);
      toast.error('Falha ao eliminar story');
    }
  };

  useEffect(() => {
    fetchAll();

    const postsChannel = supabase
      .channel('posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        logger.debug('Posts table changed, refetching...');
        fetchAll();
      })
      .subscribe();

    const storiesChannel = supabase
      .channel('stories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        logger.debug('Stories table changed, refetching...');
        fetchAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(storiesChannel);
    };
  }, [activeStatus]);

  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.tema.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.caption.toLowerCase().includes(searchQuery.toLowerCase());
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

  const showPosts = contentTypeFilter === 'all' || contentTypeFilter === 'carousel' || contentTypeFilter === 'post';
  const showStories = contentTypeFilter === 'all' || contentTypeFilter === 'stories';

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
      count: counts.total,
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 space-y-6 animate-fade-in bg-gradient-to-br from-background to-background-secondary">
          {activeTab === 'create' ? (
            /* Create Tab */
            <div className="space-y-6 animate-slide-up">
              {showModeSelector && !creationMode ? (
                <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-border">
                  <ModeSelector 
                    onModeSelect={(mode, skipNext) => {
                      setCreationMode(mode);
                      setShowModeSelector(false);
                    }}
                  />
                </div>
              ) : (
                <>
                  {/* Mode Badge */}
                  {creationMode && (
                    <ModeBadge 
                      mode={creationMode}
                      onChangeMode={() => {
                        if (hasDraft) {
                          setShowModeChangeDialog(true);
                        } else {
                          setCreationMode(null);
                          setShowModeSelector(true);
                        }
                      }}
                    />
                  )}
                  
                  {/* Content based on mode */}
                  <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 border-2 border-border">
                    {creationMode === 'ia' ? (
                      <ActionButtons />
                    ) : (
                      <div className="text-center py-12 space-y-4">
                        <p className="text-muted-foreground">Modo Manual</p>
                        <p className="text-muted-foreground max-w-md mx-auto mb-4">
                          Comece a criar a sua publicação com controlo total sobre todos os detalhes.
                        </p>
                        <Button
                          size="lg"
                          onClick={() => navigate('/manual-create')}
                          className="px-8"
                        >
                          Abrir Editor Manual
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Approve Tab */
            <div className="space-y-6 animate-slide-up">
              {/* Filters Section - Agrupada em card */}
              <div className="bg-card rounded-2xl p-6 border-2 border-border shadow-lg">
                {/* Content Type Filter */}
                <div className="mb-5">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Filtrar por Tipo
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {contentTypes.map((type) => (
                      <Button
                        key={type.id}
                        onClick={() => setContentTypeFilter(type.id)}
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-10 px-4 text-xs sm:text-sm font-bold transition-all duration-200 border-2 rounded-xl',
                          contentTypeFilter === type.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                            : 'bg-background hover:bg-accent border-border hover:border-primary/50 hover:shadow-md'
                        )}
                      >
                        {type.icon && <type.icon className="mr-1.5 h-4 w-4" />}
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Status Tabs + Search */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Estado da Publicação
                  </h3>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <Button
                          key={key}
                          onClick={() => setActiveStatus(key)}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'h-10 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 border-2 whitespace-nowrap relative',
                            activeStatus === key
                              ? config.color + ' shadow-lg'
                              : 'bg-card border-border hover:bg-accent hover:shadow-md'
                          )}
                          title={key === 'pending' && config.count > 0 ? config.breakdown : undefined}
                        >
                          <config.icon className="mr-1.5 h-4 w-4" />
                          {config.label}
                          {key === 'pending' && config.count > 0 && (
                            <Badge 
                              variant="secondary" 
                              className="ml-2 h-5 px-1.5 text-xs font-bold bg-warning text-warning-foreground"
                            >
                              {config.count}
                            </Badge>
                          )}
                        </Button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 flex-1 lg:max-w-md">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Procurar..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-10 bg-background border-2 border-border rounded-xl text-sm focus:border-primary transition-all shadow-sm"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchAll()}
                        disabled={loading}
                        className="h-10 w-10 rounded-xl border-2 border-border hover:bg-accent hover:border-primary/50 transition-all shadow-sm"
                        title="Recarregar lista"
                      >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              {loading ? (
                <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    contentTypeFilter === 'stories' || (contentTypeFilter === 'all' && i % 2 === 0) ? (
                      <StoryCardSkeleton key={i} />
                    ) : (
                      <PostCardSkeleton key={i} />
                    )
                  ))}
                </div>
              ) : allContent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 text-center bg-card rounded-xl sm:rounded-2xl border-2 border-dashed border-border shadow-lg mx-2 sm:mx-0">
                  <Inbox className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-muted-foreground/50 mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-bold mb-2 text-foreground px-4">
                    Nenhum conteúdo encontrado
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-4">
                    {searchQuery
                      ? 'Nenhum conteúdo corresponde aos critérios de pesquisa'
                      : `Não existe conteúdo ${activeStatus === 'pending' ? 'pendente' : activeStatus === 'approved' ? 'aprovado' : 'rejeitado'} neste momento`}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-scale-in">
                  {allContent.map((item, index) => (
                    <div
                      key={`${item.type}-${item.data.id}`}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className="animate-fade-in"
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </main>
        </SidebarInset>
      </div>

      {/* Mode Change Confirmation Dialog */}
      <ModeChangeConfirmDialog
        open={showModeChangeDialog}
        onOpenChange={setShowModeChangeDialog}
        onSaveAndChange={() => {
          // TODO: Implement draft saving logic
          toast.success('Rascunho guardado');
          setCreationMode(null);
          setShowModeSelector(true);
          setShowModeChangeDialog(false);
          setHasDraft(false);
        }}
        onChangeWithoutSaving={() => {
          setCreationMode(null);
          setShowModeSelector(true);
          setShowModeChangeDialog(false);
          setHasDraft(false);
        }}
      />
    </SidebarProvider>
  );
};

export default Pending;
