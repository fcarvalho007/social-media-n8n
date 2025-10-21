import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { ActionButtons } from '@/components/ActionButtons';
import { PostCard } from '@/components/PostCard';
import { StoryCard } from '@/components/StoryCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Inbox, LayoutGrid, Video, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
      console.log('🔍 Fetching stories with status:', activeTab);
      let query = supabase.from('stories').select('*');

      if (activeTab === 'approved') {
        query = query.in('status', ['approved', 'published']);
      } else {
        query = query.eq('status', activeTab);
      }

      console.log('📊 Query being executed for stories');
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching stories:', error);
        throw error;
      }

      console.log('✅ Stories data received:', data);
      console.log('📈 Number of stories:', data?.length || 0);
      setStories(data || []);
    } catch (error) {
      console.error('💥 Exception in fetchStories:', error);
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

  console.log('🎯 Stories array:', stories);
  console.log('🔎 Filtered stories:', filteredStories);
  console.log('🎨 Content type filter:', contentTypeFilter);
  console.log('🔍 Search query:', searchQuery);
  console.log('📱 Show stories?', showStories);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-4 sm:py-8 px-3 sm:px-4">
        {/* Creation Section */}
        <div className="mb-6 sm:mb-8">
          <ActionButtons />
        </div>

        {/* Review Section */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px bg-border flex-1" />
            <h3 className="text-sm font-medium text-muted-foreground">Rever e aprovar publicações</h3>
            <div className="h-px bg-border flex-1" />
          </div>
        </div>

        {/* Content Type Filter */}
        <div className="mb-4 sm:mb-6 flex flex-wrap gap-1.5 sm:gap-2">
          <Badge
            variant={contentTypeFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
            onClick={() => setContentTypeFilter('all')}
          >
            Todos os tipos
          </Badge>
          <Badge
            variant={contentTypeFilter === 'carousel' ? 'default' : 'outline'}
            className="cursor-pointer px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5"
            onClick={() => setContentTypeFilter('carousel')}
          >
            <LayoutGrid className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Carrossel
          </Badge>
          <Badge
            variant={contentTypeFilter === 'stories' ? 'default' : 'outline'}
            className="cursor-pointer px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5"
            onClick={() => setContentTypeFilter('stories')}
          >
            <Video className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Stories
          </Badge>
          <Badge
            variant={contentTypeFilter === 'post' ? 'default' : 'outline'}
            className="cursor-pointer px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5"
            onClick={() => setContentTypeFilter('post')}
          >
            <ImageIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Post
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
              <TabsTrigger value="pending" className="text-xs sm:text-sm">Pendentes</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs sm:text-sm">Aprovados</TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs sm:text-sm">Rejeitados</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 w-full sm:flex-1 sm:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Procurar por tema ou legenda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchAll()}
                disabled={loading}
                className="flex-shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPosts.length === 0 && filteredStories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum conteúdo encontrado</h3>
                <p className="text-muted-foreground max-w-md">
                  {searchQuery
                    ? "Nenhum conteúdo corresponde aos critérios de pesquisa"
                    : `Não existe conteúdo ${activeTab === 'pending' ? 'pendente' : activeTab === 'approved' ? 'aprovado' : 'rejeitado'} neste momento`}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
      </main>
    </div>
  );
};

export default Pending;
