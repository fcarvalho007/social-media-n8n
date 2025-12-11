import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  ArrowLeft, 
  Download, 
  RefreshCw, 
  Trash2,
  Search,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface FailedPost {
  id: string;
  tema: string;
  caption: string;
  error_log: string | null;
  failed_at: string | null;
  status: string;
  post_type: string;
  selected_networks: string[];
  scheduled_date: string | null;
  created_at: string;
  recovery_token: string;
  retry_count: number;
}

const FailedPublications = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FailedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [retryingAll, setRetryingAll] = useState(false);

  useEffect(() => {
    fetchFailedPosts();
  }, []);

  const fetchFailedPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'failed')
        .order('failed_at', { ascending: false });

      if (error) throw error;
      setPosts((data || []) as FailedPost[]);
    } catch (error) {
      console.error('Error fetching failed posts:', error);
      toast.error('Erro ao carregar publicações falhadas');
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.tema.toLowerCase().includes(search.toLowerCase()) ||
                         post.caption.toLowerCase().includes(search.toLowerCase());
    
    if (platformFilter === 'all') return matchesSearch;
    
    return matchesSearch && post.selected_networks?.includes(platformFilter);
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPosts.map(p => p.id)));
    }
  };

  const handleRetrySelected = async () => {
    if (selectedIds.size === 0) return;
    
    setRetryingAll(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          status: 'approved',
          error_log: null,
          failed_at: null
        })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} publicações marcadas para nova tentativa`);
      setSelectedIds(new Set());
      fetchFailedPosts();
    } catch (error) {
      console.error('Error retrying posts:', error);
      toast.error('Erro ao tentar novamente');
    } finally {
      setRetryingAll(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Tens a certeza que queres eliminar ${selectedIds.size} publicações?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} publicações eliminadas`);
      setSelectedIds(new Set());
      fetchFailedPosts();
    } catch (error) {
      console.error('Error deleting posts:', error);
      toast.error('Erro ao eliminar');
    }
  };

  const handleSingleRetry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          status: 'approved',
          error_log: null,
          failed_at: null
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Publicação marcada para nova tentativa');
      fetchFailedPosts();
    } catch (error) {
      console.error('Error retrying post:', error);
      toast.error('Erro ao tentar novamente');
    }
  };

  const getNetworkBadgeColor = (network: string) => {
    const colors: Record<string, string> = {
      instagram: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      linkedin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      youtube: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      tiktok: 'bg-black text-white',
      facebook: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    };
    return colors[network] || 'bg-muted';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                Publicações Falhadas
              </h1>
              <p className="text-muted-foreground">
                {posts.length} publicações com erro
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{posts.length}</p>
                  <p className="text-sm text-muted-foreground">Total Falhadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {posts.filter(p => (p.retry_count || 0) > 0).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Com Retries</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {posts.filter(p => {
                      if (!p.failed_at) return false;
                      const today = new Date();
                      const failed = new Date(p.failed_at);
                      return failed.toDateString() === today.toDateString();
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{selectedIds.size}</p>
                  <p className="text-sm text-muted-foreground">Selecionadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por tema ou legenda..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por rede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as redes</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="font-medium">
                  {selectedIds.size} {selectedIds.size === 1 ? 'publicação selecionada' : 'publicações selecionadas'}
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRetrySelected}
                    disabled={retryingAll}
                  >
                    {retryingAll ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Tentar Novamente
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts List */}
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma publicação falhada</h3>
              <p className="text-muted-foreground">
                {search || platformFilter !== 'all' 
                  ? 'Nenhum resultado para os filtros aplicados'
                  : 'Todas as publicações foram processadas com sucesso!'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Select All */}
            <div className="flex items-center gap-2 px-2">
              <Checkbox 
                checked={selectedIds.size === filteredPosts.length && filteredPosts.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Selecionar todas</span>
            </div>

            {filteredPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox 
                      checked={selectedIds.has(post.id)}
                      onCheckedChange={() => toggleSelect(post.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{post.tema}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {post.caption}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/recovery/${post.recovery_token}`)}
                            title="Ver detalhes"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSingleRetry(post.id)}
                            title="Tentar novamente"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center flex-wrap gap-2 mt-3">
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Falhou
                        </Badge>
                        
                        <Badge variant="secondary" className="text-xs">
                          {post.post_type}
                        </Badge>
                        
                        {post.selected_networks?.map((network) => (
                          <Badge key={network} className={`text-xs ${getNetworkBadgeColor(network)}`}>
                            {network}
                          </Badge>
                        ))}
                        
                        {(post.retry_count || 0) > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {post.retry_count} tentativas
                          </Badge>
                        )}
                      </div>
                      
                      {post.error_log && (
                        <div className="mt-3 p-2 bg-destructive/10 rounded text-xs text-destructive font-mono truncate">
                          {post.error_log}
                        </div>
                      )}
                      
                      {post.failed_at && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Falhou {format(new Date(post.failed_at), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FailedPublications;
