import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  AlertTriangle
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
};

const statusConfig = {
  success: { label: 'Sucesso', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
};

export default function PublicationHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { data: attempts, isLoading, refetch, isRefetching } = useQuery({
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

  const filteredAttempts = useMemo(() => {
    if (!attempts) return [];
    
    return attempts.filter(attempt => {
      const matchesSearch = searchTerm === '' || 
        attempt.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (attempt.format?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (attempt.error_message?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || attempt.status === statusFilter;
      const matchesPlatform = platformFilter === 'all' || attempt.platform === platformFilter;
      
      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [attempts, searchTerm, statusFilter, platformFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!attempts) return { total: 0, success: 0, failed: 0, pending: 0 };
    
    return {
      total: attempts.length,
      success: attempts.filter(a => a.status === 'success').length,
      failed: attempts.filter(a => a.status === 'failed').length,
      pending: attempts.filter(a => a.status === 'pending').length,
    };
  }, [attempts]);

  // Group by date
  const groupedAttempts = useMemo(() => {
    const groups: Record<string, PublicationAttempt[]> = {};
    
    filteredAttempts.forEach(attempt => {
      const date = format(new Date(attempt.attempted_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(attempt);
    });
    
    return groups;
  }, [filteredAttempts]);

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
    };
    return formatMap[format] || format;
  };

  const renderAttemptCard = (attempt: PublicationAttempt) => {
    const statusInfo = statusConfig[attempt.status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = statusInfo.icon;
    const PlatformIcon = platformIcons[attempt.platform] || FileText;
    const isExpanded = expandedItems.has(attempt.id);

    return (
      <Collapsible key={attempt.id} open={isExpanded} onOpenChange={() => toggleExpanded(attempt.id)}>
        <Card className={cn(
          "transition-all duration-200 hover:shadow-md",
          attempt.status === 'failed' && "border-red-200 dark:border-red-900/50",
          attempt.status === 'success' && "border-green-200 dark:border-green-900/50"
        )}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Platform Icon */}
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm",
                    platformColors[attempt.platform] || 'bg-gray-500'
                  )}>
                    <PlatformIcon className="h-5 w-5" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base capitalize">
                        {attempt.platform}
                      </CardTitle>
                      {attempt.format && (
                        <Badge variant="outline" className="text-xs">
                          {getFormatLabel(attempt.format)}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      {formatDistanceToNow(new Date(attempt.attempted_at), { addSuffix: true, locale: pt })}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={cn("gap-1", statusInfo.color)}>
                    <StatusIcon className="h-3 w-3" />
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
                  <span>{format(new Date(attempt.attempted_at), "dd MMM yyyy 'às' HH:mm:ss", { locale: pt })}</span>
                </div>
                
                {/* Post ID */}
                {attempt.post_id && (
                  <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                    Post ID: {attempt.post_id}
                  </div>
                )}
                
                {/* Error Message */}
                {attempt.error_message && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-300 break-all">
                        {attempt.error_message}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Response Data */}
                {attempt.response_data && Object.keys(attempt.response_data).length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Resposta da API:</p>
                    <pre className="text-xs overflow-auto max-h-32 bg-background p-2 rounded border">
                      {JSON.stringify(attempt.response_data, null, 2)}
                    </pre>
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
            <p className="text-sm text-muted-foreground">Acompanha todas as tentativas de publicação</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por plataforma, formato ou erro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos estados</SelectItem>
            <SelectItem value="success">Sucesso</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
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
      ) : filteredAttempts.length === 0 ? (
        <Card className="p-12 text-center">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sem registos</h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm || statusFilter !== 'all' || platformFilter !== 'all'
              ? 'Nenhuma publicação encontrada com os filtros aplicados'
              : 'As tuas publicações aparecerão aqui'}
          </p>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-400px)] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedAttempts).map(([date, dateAttempts]) => (
              <div key={date}>
                <div className="sticky top-0 bg-background/95 backdrop-blur py-2 mb-3 z-10">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(date), "EEEE, d 'de' MMMM", { locale: pt })}
                    <Badge variant="secondary" className="ml-2">{dateAttempts.length}</Badge>
                  </h3>
                </div>
                <div className="space-y-3">
                  {dateAttempts.map(renderAttemptCard)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
