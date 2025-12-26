import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Instagram,
  Linkedin,
  Youtube,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
  FileText,
  AlertTriangle,
  Image,
  FileImage,
  Send,
  Loader2,
  RotateCcw,
  Copy
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PublicationAttempt {
  id: string;
  post_id: string | null;
  platform: string;
  format: string | null;
  status: string;
  error_message: string | null;
  response_data: any;
  attempted_at: string;
  created_at: string;
}

interface PostRecord {
  id: string;
  tema: string;
  caption: string;
  caption_edited: string | null;
  status: string | null;
  post_type: string | null;
  selected_networks: string[] | null;
  template_a_images: string[];
  media_items: any;
  scheduled_date: string | null;
  published_at: string | null;
  failed_at: string | null;
  created_at: string | null;
  origin_mode: string | null;
  error_log: string | null;
  first_comment: string | null;
  linkedin_body: string | null;
}

interface CombinedHistoryItem {
  id: string;
  type: 'attempt' | 'post';
  platform: string;
  format: string | null;
  status: string;
  error_message: string | null;
  timestamp: string;
  post_id: string | null;
  caption?: string;
  tema?: string;
  image_url?: string;
  response_data?: any;
  origin_mode?: string;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

const platformColors: Record<string, string> = {
  instagram: 'bg-gradient-to-br from-pink-500 to-purple-600',
  linkedin: 'bg-gradient-to-br from-blue-600 to-blue-700',
  youtube: 'bg-gradient-to-br from-red-500 to-red-600',
  facebook: 'bg-gradient-to-br from-blue-500 to-blue-600',
  tiktok: 'bg-gradient-to-br from-gray-900 to-gray-800',
  googlebusiness: 'bg-gradient-to-br from-green-500 to-green-600',
};

const statusConfig = {
  success: { label: 'Sucesso', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  published: { label: 'Publicado', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  publishing: { label: 'A publicar...', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2 },
  scheduled: { label: 'Agendado', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: Calendar },
  approved: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

export default function PublicationHistory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Sync tab with URL param on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['all', 'success', 'failed', 'pending'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Fetch publication attempts
  const { data: attempts, isLoading: attemptsLoading, refetch: refetchAttempts } = useQuery({
    queryKey: ['publication-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publication_attempts')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as PublicationAttempt[];
    },
  });

  // Fetch posts with manual origin - including all fields needed for recovery
  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ['publication-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, tema, caption, caption_edited, status, post_type, selected_networks, template_a_images, media_items, scheduled_date, published_at, failed_at, created_at, origin_mode, error_log, first_comment, linkedin_body')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as PostRecord[];
    },
  });

  const isLoading = attemptsLoading || postsLoading;

  const refetch = () => {
    refetchAttempts();
    refetchPosts();
  };

  // Combine and deduplicate data
  const combinedHistory = useMemo(() => {
    const items: CombinedHistoryItem[] = [];
    const seenPostIds = new Set<string>();

    // Add publication attempts first (these are the most accurate for individual platform results)
    if (attempts) {
      for (const attempt of attempts) {
        items.push({
          id: `attempt-${attempt.id}`,
          type: 'attempt',
          platform: attempt.platform,
          format: attempt.format,
          status: attempt.status,
          error_message: attempt.error_message,
          timestamp: attempt.attempted_at,
          post_id: attempt.post_id,
          response_data: attempt.response_data,
        });
        
        if (attempt.post_id) {
          seenPostIds.add(attempt.post_id);
        }
      }
    }

    // Add posts that don't have corresponding attempts (drafts, scheduled, etc.)
    if (posts) {
      for (const post of posts) {
        // Skip if we already have attempts for this post
        if (seenPostIds.has(post.id)) continue;

        // Only show posts that are interesting (not just pending from workflow)
        const showableStatuses = ['publishing', 'published', 'failed', 'scheduled', 'approved', 'rejected'];
        if (!post.status || !showableStatuses.includes(post.status)) continue;

        const networks = post.selected_networks || [];
        const platform = networks[0] || 'instagram';

        items.push({
          id: `post-${post.id}`,
          type: 'post',
          platform: platform,
          format: post.post_type,
          status: post.status || 'pending',
          error_message: post.error_log,
          timestamp: post.published_at || post.failed_at || post.created_at || new Date().toISOString(),
          post_id: post.id,
          caption: post.caption,
          tema: post.tema,
          image_url: post.template_a_images?.[0],
          origin_mode: post.origin_mode,
        });
      }
    }

    // Sort by timestamp
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }, [attempts, posts]);

  // Filter based on tab and filters
  const filteredItems = useMemo(() => {
    return combinedHistory.filter(item => {
      // Tab filter
      if (activeTab === 'success' && !['success', 'published'].includes(item.status)) return false;
      if (activeTab === 'failed' && item.status !== 'failed') return false;
      if (activeTab === 'pending' && !['pending', 'publishing', 'scheduled'].includes(item.status)) return false;

      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        const itemDate = new Date(item.timestamp);
        
        if (dateFilter === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (itemDate < today) return false;
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (itemDate < weekAgo) return false;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (itemDate < monthAgo) return false;
        }
      }

      // Search filter
      const matchesSearch = searchTerm === '' || 
        item.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.format?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.error_message?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.caption?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.tema?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesPlatform = platformFilter === 'all' || item.platform === platformFilter;
      
      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [combinedHistory, activeTab, searchTerm, statusFilter, platformFilter, dateFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!combinedHistory) return { total: 0, success: 0, failed: 0, pending: 0 };
    
    return {
      total: combinedHistory.length,
      success: combinedHistory.filter(a => ['success', 'published'].includes(a.status)).length,
      failed: combinedHistory.filter(a => a.status === 'failed').length,
      pending: combinedHistory.filter(a => ['pending', 'publishing', 'scheduled'].includes(a.status)).length,
    };
  }, [combinedHistory]);

  // Group by date
  const groupedItems = useMemo(() => {
    const groups: Record<string, CombinedHistoryItem[]> = {};
    
    filteredItems.forEach(item => {
      const date = format(new Date(item.timestamp), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    
    return groups;
  }, [filteredItems]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getFormatLabel = (format: string | null) => {
    if (!format) return 'Post';
    const formatMap: Record<string, string> = {
      instagram_carousel: 'Carrossel',
      instagram_image: 'Imagem',
      instagram_stories: 'Story',
      instagram_reel: 'Reel',
      linkedin_post: 'Post',
      linkedin_document: 'Documento',
      youtube_shorts: 'Shorts',
      youtube_video: 'Vídeo',
      tiktok_video: 'Vídeo',
      facebook_image: 'Imagem',
      facebook_stories: 'Story',
      facebook_reel: 'Reel',
      googlebusiness_post: 'Post',
      carousel: 'Carrossel',
      image: 'Imagem',
      video: 'Vídeo',
    };
    return formatMap[format] || format;
  };

  const renderItemCard = (item: CombinedHistoryItem) => {
    const statusInfo = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = statusInfo.icon;
    const PlatformIcon = platformIcons[item.platform] || FileText;
    const isExpanded = expandedItems.has(item.id);

    return (
      <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
        <Card className={cn(
          "transition-all duration-200 hover:shadow-md",
          item.status === 'failed' && "border-red-200 dark:border-red-900/50",
          ['success', 'published'].includes(item.status) && "border-green-200 dark:border-green-900/50",
          item.status === 'publishing' && "border-blue-200 dark:border-blue-900/50"
        )}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Image preview if available */}
                  {item.image_url && (
                    <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      <img 
                        src={item.image_url} 
                        alt="" 
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Platform Icon */}
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0",
                    platformColors[item.platform] || 'bg-gray-500'
                  )}>
                    <PlatformIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base capitalize">
                        {item.platform}
                      </CardTitle>
                      {item.format && (
                        <Badge variant="outline" className="text-xs">
                          {getFormatLabel(item.format)}
                        </Badge>
                      )}
                      {item.origin_mode && (
                        <Badge variant="secondary" className="text-xs">
                          {item.origin_mode === 'manual' ? 'Manual' : 'Auto'}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-0.5 truncate">
                      {item.tema || item.caption?.substring(0, 50) || formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: pt })}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={cn("gap-1", statusInfo.color)}>
                    <StatusIcon className={cn("h-3 w-3", item.status === 'publishing' && "animate-spin")} />
                    {statusInfo.label}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-4">
              <div className="space-y-3 pt-2 border-t">
                {/* Timestamp */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(item.timestamp), "dd MMM yyyy 'às' HH:mm:ss", { locale: pt })}</span>
                </div>

                {/* Caption preview */}
                {item.caption && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Legenda:</p>
                    <p className="text-sm line-clamp-3">{item.caption}</p>
                  </div>
                )}
                
                {/* Post ID */}
                {item.post_id && (
                  <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                    Post ID: {item.post_id}
                  </div>
                )}
                
                {/* Error Message */}
                {item.error_message && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-300 break-all">
                        {item.error_message}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Response Data */}
                {item.response_data && Object.keys(item.response_data).length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Resposta da API:</p>
                    <pre className="text-xs overflow-auto max-h-32 bg-background p-2 rounded border">
                      {JSON.stringify(item.response_data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Recovery Button */}
                {item.post_id && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant={item.status === 'failed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => navigate(`/manual-create?recover=${item.post_id}`)}
                      className="gap-2 flex-1"
                    >
                      {item.status === 'failed' ? (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          Tentar Novamente
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Reutilizar Conteúdo
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Histórico de Publicações</h1>
            <p className="text-sm text-muted-foreground">Todas as publicações e tentativas</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </Card>
        <Card className="p-4 border-green-200 dark:border-green-900/50">
          <div className="text-2xl font-bold text-green-600">{stats.success}</div>
          <div className="text-xs text-muted-foreground">Sucesso</div>
        </Card>
        <Card className="p-4 border-red-200 dark:border-red-900/50">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-xs text-muted-foreground">Falharam</div>
        </Card>
        <Card className="p-4 border-yellow-200 dark:border-yellow-900/50">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">Pendentes</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="gap-1">
            <History className="h-4 w-4" />
            Tudo
          </TabsTrigger>
          <TabsTrigger value="success" className="gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Sucesso
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-1">
            <XCircle className="h-4 w-4" />
            Falhas
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1">
            <Clock className="h-4 w-4" />
            Pendentes
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por plataforma, formato, legenda ou erro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Data" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as datas</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mês</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos estados</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="publishing">A publicar</SelectItem>
            <SelectItem value="scheduled">Agendado</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="googlebusiness">Google Business</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sem registos</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm || statusFilter !== 'all' || platformFilter !== 'all' || activeTab !== 'all'
              ? 'Nenhuma publicação encontrada com os filtros aplicados'
              : 'As tuas publicações aparecerão aqui quando publicares algo'}
          </p>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-500px)] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([date, dateItems]) => (
              <div key={date}>
                <div className="sticky top-0 bg-background/95 backdrop-blur py-2 mb-3 z-10">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(date), "EEEE, d 'de' MMMM", { locale: pt })}
                    <Badge variant="secondary" className="ml-2">{dateItems.length}</Badge>
                  </h3>
                </div>
                <div className="space-y-3">
                  {dateItems.map(renderItemCard)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}