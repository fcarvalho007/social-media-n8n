import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebar } from '@/components/AppSidebar';
import { ActionButtons } from '@/components/ActionButtons';
import { PostCard } from '@/components/PostCard';
import { StoryCard } from '@/components/StoryCard';
import { PostCardSkeleton } from '@/components/PostCardSkeleton';
import { StoryCardSkeleton } from '@/components/StoryCardSkeleton';
import { SidebarProvider } from '@/components/ui/sidebar';
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

const Pending = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('pending');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'approve';

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase.from('posts').select('*');

      if (activeStatus === 'approved') {
        query = query.in('status', ['approved', 'published']);
      } else {
        query = query.eq('status', activeStatus);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const sortedData = (data || []).sort((a, b) => {
        if (a.status === 'approved' && b.status === 'published') return -1;
        if (a.status === 'published' && b.status === 'approved') return 1;
        return 0;
      });

      setPosts(sortedData);
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
        query = query.in('status', ['approved', 'published']);
      } else {
        query = query.eq('status', activeStatus);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

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
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      toast.success('Publicação eliminada com sucesso');
      fetchAll();
    } catch (error) {
      logger.error('Erro ao eliminar publicação', error);
      toast.error('Falha ao eliminar publicação');
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase.from('stories').delete().eq('id', storyId);
      if (error) throw error;
      toast.success('Story eliminado com sucesso');
      fetchAll();
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
  }, []);

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

  const statusConfig = {
    pending: { label: 'Pendentes', icon: Clock, color: 'bg-warning-light text-warning border-warning/20', count: 0 },
    approved: { label: 'Aprovados', icon: CheckCircle2, color: 'bg-success-light text-success border-success/20', count: 0 },
    rejected: { label: 'Rejeitados', icon: XCircle, color: 'bg-destructive-light text-destructive border-destructive/20', count: 0 },
  };

  const contentTypes = [
    { id: 'all', label: 'Todos', icon: null },
    { id: 'carousel', label: 'Carrossel', icon: LayoutGrid },
    { id: 'stories', label: 'Stories', icon: Video },
    { id: 'post', label: 'Post', icon: ImageIcon },
  ];

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-background-secondary">
        <AppSidebar />
        
        <main className="flex-1 p-6 lg:p-10 animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Painel de Conteúdo
            </h1>
            <p className="text-muted-foreground text-base">
              Crie novos conteúdos e faça a revisão de publicações pendentes
            </p>
          </div>

          {activeTab === 'create' ? (
            /* Create Tab */
            <div className="animate-slide-up">
              <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
                <h2 className="text-2xl font-bold mb-2">Criar Novo Conteúdo</h2>
                <p className="text-muted-foreground mb-6">
                  Selecione o tipo de conteúdo que deseja criar
                </p>
                <ActionButtons />
              </div>
            </div>
          ) : (
            /* Approve Tab */
            <div className="space-y-6 animate-slide-up">
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="flex-1 h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all glow-primary"
                  onClick={() => navigate('/pending')}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Aprovar Conteúdo
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 h-14 text-base font-semibold border-2 hover:bg-primary/5 hover:border-primary transition-all"
                  onClick={() => navigate('/pending?tab=create')}
                >
                  <span className="mr-2 text-xl">➕</span>
                  Criar Novo
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Crie novos conteúdos ou faça a revisão de publicações pendentes
              </p>

              <div className="h-px bg-border/50" />

              {/* Content Type Filter */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Filtrar por Tipo
                </h3>
                <div className="flex flex-wrap gap-2">
                  {contentTypes.map((type) => (
                    <Button
                      key={type.id}
                      onClick={() => setContentTypeFilter(type.id)}
                      variant="outline"
                      className={cn(
                        'h-11 px-6 text-sm font-semibold transition-all border-2 rounded-xl',
                        contentTypeFilter === type.id
                          ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105 glow-primary'
                          : 'bg-card hover:bg-card-hover border-border hover:border-primary/50'
                      )}
                    >
                      {type.icon && <type.icon className="mr-2 h-4 w-4" />}
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status Tabs + Search */}
              <div className="bg-muted/30 rounded-2xl p-6 border border-border/50">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div className="flex gap-2">
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <Button
                        key={key}
                        onClick={() => setActiveStatus(key)}
                        variant="ghost"
                        className={cn(
                          'h-12 px-6 text-sm font-bold rounded-xl transition-all border-2',
                          activeStatus === key
                            ? config.color + ' shadow-lg scale-105'
                            : 'bg-card border-border hover:bg-card-hover'
                        )}
                      >
                        <config.icon className="mr-2 h-4 w-4" />
                        {config.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-1 lg:max-w-md">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Procurar por tema ou legenda..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 bg-card border-border/50 rounded-xl"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fetchAll()}
                      disabled={loading}
                      className="h-12 w-12 rounded-xl border-2 hover:bg-card-hover"
                      title="Recarregar lista"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              {loading ? (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    contentTypeFilter === 'stories' || (contentTypeFilter === 'all' && i % 2 === 0) ? (
                      <StoryCardSkeleton key={i} />
                    ) : (
                      <PostCardSkeleton key={i} />
                    )
                  ))}
                </div>
              ) : filteredPosts.length === 0 && filteredStories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border-2 border-dashed border-border/50">
                  <Inbox className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    Nenhum conteúdo encontrado
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {searchQuery
                      ? 'Nenhum conteúdo corresponde aos critérios de pesquisa'
                      : `Não existe conteúdo ${activeStatus === 'pending' ? 'pendente' : activeStatus === 'approved' ? 'aprovado' : 'rejeitado'} neste momento`}
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-scale-in">
                  {showPosts && filteredPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={() => navigate(`/review/${post.id}`)}
                      onDelete={handleDelete}
                    />
                  ))}
                  {showStories && filteredStories.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      onClick={() => navigate(`/review-story/${story.id}`)}
                      onDelete={handleDeleteStory}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Pending;
