import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { ActionButtons } from '@/components/ActionButtons';
import { PostCard } from '@/components/PostCard';
import { StoryCard } from '@/components/StoryCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Inbox, LayoutGrid, Video, Image as ImageIcon, RefreshCw, CheckCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Pending = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const navigate = useNavigate();

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase.from('posts').select('*');

      // For approved tab, show both approved and published posts
      if (activeTab === 'approved') {
        query = query.in('status', ['approved', 'published']);
      } else {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Sort approved posts first, then published posts
      const sortedData = (data || []).sort((a, b) => {
        if (a.status === 'approved' && b.status === 'published') return -1;
        if (a.status === 'published' && b.status === 'approved') return 1;
        return 0;
      });

      setPosts(sortedData);
    } catch (error) {
      console.error('Erro ao carregar publicações:', error);
      toast.error('Falha ao carregar publicações');
    } finally {
      setLoading(false);
    }
  };

  const fetchStories = async () => {
    try {
      let query = supabase.from('stories').select('*');

      if (activeTab === 'approved') {
        query = query.in('status', ['approved', 'published']);
      } else {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setStories(data || []);
    } catch (error) {
      console.error('Erro ao carregar stories:', error);
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
      
      toast.success('Publicação eliminada com sucesso');
      fetchAll();
    } catch (error) {
      console.error('Erro ao eliminar publicação:', error);
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
      
      toast.success('Story eliminado com sucesso');
      fetchAll();
    } catch (error) {
      console.error('Erro ao eliminar story:', error);
      toast.error('Falha ao eliminar story');
    }
  };

  useEffect(() => {
    fetchAll();

    // Set up realtime subscriptions
    const postsChannel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    const storiesChannel = supabase
      .channel('stories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
        },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(storiesChannel);
    };
  }, [activeTab]);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6 sm:py-10 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Main Page Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Painel de Conteúdo</h1>
          <p className="text-sm text-muted-foreground">Crie novos conteúdos e faça a revisão de publicações pendentes</p>
        </div>

        {/* Main Tabs: Approve vs Create */}
        <Tabs defaultValue="approve" className="space-y-8">
          <TabsList className="w-full sm:w-auto h-11 bg-muted/50 p-1 rounded-lg border border-border/50">
            <TabsTrigger 
              value="approve" 
              className="gap-2 px-6 py-2 text-sm font-semibold rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <CheckCircle className="h-4 w-4" />
              Aprovar Conteúdo
            </TabsTrigger>
            <TabsTrigger 
              value="create" 
              className="gap-2 px-6 py-2 text-sm font-semibold rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              Criar Novo
            </TabsTrigger>
          </TabsList>

          {/* Tab: Create New Content */}
          <TabsContent value="create" className="space-y-6 mt-6">
            <ActionButtons />
          </TabsContent>

          {/* Tab: Approve Content (Default) */}
          <TabsContent value="approve" className="space-y-6">
            {/* Content Type Filter */}
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setContentTypeFilter('all')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2",
                  contentTypeFilter === 'all'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                )}
              >
                Todos os tipos
              </button>
              <button
                onClick={() => setContentTypeFilter('carousel')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2",
                  contentTypeFilter === 'carousel'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Carrossel
              </button>
              <button
                onClick={() => setContentTypeFilter('stories')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2",
                  contentTypeFilter === 'stories'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                )}
              >
                <Video className="h-4 w-4" />
                Stories
              </button>
              <button
                onClick={() => setContentTypeFilter('post')}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2",
                  contentTypeFilter === 'post'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                )}
              >
                <ImageIcon className="h-4 w-4" />
                Post
              </button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-lg border border-border/50">
                <TabsList className="w-full sm:w-auto grid grid-cols-3 h-10 bg-background shadow-sm">
                  <TabsTrigger 
                    value="pending" 
                    className="text-sm font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md transition-all"
                  >
                    Pendentes
                  </TabsTrigger>
                  <TabsTrigger 
                    value="approved" 
                    className="text-sm font-semibold data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-md transition-all"
                  >
                    Aprovados
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rejected" 
                    className="text-sm font-semibold data-[state=active]:bg-red-500 data-[state=active]:text-white rounded-md transition-all"
                  >
                    Rejeitados
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2 w-full sm:flex-1 sm:max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Procurar por tema ou legenda..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 text-sm h-10 bg-background border-border/50"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchAll()}
                    disabled={loading}
                    className="flex-shrink-0 h-10 w-10 border-border/50 hover:bg-muted/50"
                    title="Recarregar lista"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              <TabsContent value={activeTab} className="space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-lg">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">A carregar conteúdos...</p>
                  </div>
                ) : filteredPosts.length === 0 && filteredStories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-xl border-2 border-dashed border-border/50">
                    <Inbox className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-foreground">Nenhum conteúdo encontrado</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {searchQuery
                        ? "Nenhum conteúdo corresponde aos critérios de pesquisa"
                        : `Não existe conteúdo ${activeTab === 'pending' ? 'pendente' : activeTab === 'approved' ? 'aprovado' : 'rejeitado'} neste momento`}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Pending;
