import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
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
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-background-secondary">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader />
          
          <main className="flex-1 p-4 sm:p-6 lg:p-10 animate-fade-in overflow-auto bg-gradient-to-br from-white to-gray-50">
          {activeTab === 'create' ? (
            /* Create Tab */
            <div className="animate-slide-up">
              <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
                <ActionButtons />
              </div>
            </div>
          ) : (
            /* Approve Tab */
            <div className="space-y-6 animate-slide-up">
              {/* Filters Section - Agrupada em card */}
              <div className="bg-[#F9FAFB] rounded-2xl p-5 border border-gray-200">
                {/* Content Type Filter */}
                <div className="mb-5">
                  <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3">
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
                            ? 'bg-[#4169A0] text-white border-[#4169A0] shadow-md'
                            : 'bg-white hover:bg-gray-50 border-gray-300 hover:border-[#4169A0]/50 hover:shadow-sm'
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
                  <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
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
                            'h-10 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 border-2 whitespace-nowrap',
                            activeStatus === key
                              ? key === 'pending'
                                ? 'bg-[#FBBF24] text-white border-[#FBBF24] shadow-md'
                                : config.color + ' shadow-md'
                              : 'bg-white border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                          )}
                        >
                          <config.icon className="mr-1.5 h-4 w-4" />
                          {config.label}
                        </Button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 flex-1 lg:max-w-md">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
                        <Input
                          placeholder="Procurar..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-10 bg-white border-gray-300 rounded-xl text-sm focus:border-[#4169A0] transition-all"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchAll()}
                        disabled={loading}
                        className="h-10 w-10 rounded-xl border-2 border-gray-300 hover:bg-gray-50 hover:border-[#4169A0]/50 transition-all"
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
              ) : filteredPosts.length === 0 && filteredStories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 text-center bg-white rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-200 shadow-sm mx-2 sm:mx-0">
                  <Inbox className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-gray-300 mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground px-4">
                    Nenhum conteúdo encontrado
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6B7280] max-w-md px-4">
                    {searchQuery
                      ? 'Nenhum conteúdo corresponde aos critérios de pesquisa'
                      : `Não existe conteúdo ${activeStatus === 'pending' ? 'pendente' : activeStatus === 'approved' ? 'aprovado' : 'rejeitado'} neste momento`}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-scale-in">
                  {showPosts && filteredPosts.map((post, index) => (
                    <div
                      key={post.id}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className="animate-fade-in"
                    >
                      <PostCard
                        post={post}
                        onClick={() => navigate(`/review/${post.id}`)}
                        onDelete={handleDelete}
                      />
                    </div>
                  ))}
                  {showStories && filteredStories.map((story, index) => (
                    <div
                      key={story.id}
                      style={{ animationDelay: `${(filteredPosts.length + index) * 50}ms` }}
                      className="animate-fade-in"
                    >
                      <StoryCard
                        story={story}
                        onClick={() => navigate(`/review-story/${story.id}`)}
                        onDelete={handleDeleteStory}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Pending;
