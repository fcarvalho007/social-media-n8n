import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { PostCard } from '@/components/PostCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Inbox, LayoutGrid, Video, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const Pending = () => {
  const [posts, setPosts] = useState<any[]>([]);
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

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
      toast.success('Publicação eliminada com sucesso');
      fetchPosts();
    } catch (error) {
      console.error('Erro ao eliminar publicação:', error);
      toast.error('Falha ao eliminar publicação');
    }
  };

  useEffect(() => {
    fetchPosts();

    // Set up realtime subscription
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.tema.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.caption.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesContentType = contentTypeFilter === 'all' || post.content_type === contentTypeFilter;
    return matchesSearch && matchesContentType;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-4 sm:py-8 px-4">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Painel de Conteúdo</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Reveja e aprove publicações de carrossel Instagram</p>
        </div>

        {/* Content Type Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge
            variant={contentTypeFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer px-4 py-2 text-sm"
            onClick={() => setContentTypeFilter('all')}
          >
            Todos os tipos
          </Badge>
          <Badge
            variant={contentTypeFilter === 'carousel' ? 'default' : 'outline'}
            className="cursor-pointer px-4 py-2 text-sm flex items-center gap-1.5"
            onClick={() => setContentTypeFilter('carousel')}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Carrossel
          </Badge>
          <Badge
            variant={contentTypeFilter === 'stories' ? 'default' : 'outline'}
            className="cursor-pointer px-4 py-2 text-sm flex items-center gap-1.5"
            onClick={() => setContentTypeFilter('stories')}
          >
            <Video className="h-3.5 w-3.5" />
            Stories
          </Badge>
          <Badge
            variant={contentTypeFilter === 'post' ? 'default' : 'outline'}
            className="cursor-pointer px-4 py-2 text-sm flex items-center gap-1.5"
            onClick={() => setContentTypeFilter('post')}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Post
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="approved">Aprovados</TabsTrigger>
              <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
            </TabsList>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Procurar por tema ou legenda..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma publicação encontrada</h3>
                <p className="text-muted-foreground max-w-md">
                  {searchQuery
                    ? "Nenhuma publicação corresponde aos critérios de pesquisa"
                    : `Não existem publicações ${activeTab === 'pending' ? 'pendentes' : activeTab === 'approved' ? 'aprovadas' : 'rejeitadas'} neste momento`}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={() => navigate(`/review/${post.id}`)}
                    onDelete={handleDelete}
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
