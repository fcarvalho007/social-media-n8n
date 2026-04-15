import { useState, useMemo, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Send,
  Loader2,
  RotateCcw,
  Copy,
  Download,
  ExternalLink,
  Plus,
  AlertCircle
} from 'lucide-react';
import { downloadPublicationAssets } from '@/lib/downloadUtils';
import { toast } from 'sonner';
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
  hashtags: string[] | null;
  external_post_ids: Record<string, string> | null;
}

interface PlatformResult {
  platform: string;
  format: string | null;
  status: string;
  error_message: string | null;
  response_data?: any;
  external_url?: string;
  attempted_at: string;
}

interface ConsolidatedItem {
  id: string;
  post_id: string | null;
  caption?: string;
  tema?: string;
  image_url?: string;
  media_urls?: string[];
  origin_mode?: string;
  hashtags?: string[];
  post_type?: string;
  timestamp: string;
  overallStatus: string;
  platforms: PlatformResult[];
  error_message?: string | null;
  successCount?: number;
  totalPlatforms?: number;
  isDuplicate?: boolean;
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  success: { label: 'Sucesso', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  published: { label: 'Publicado', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  partial: { label: 'Parcial', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  publishing: { label: 'A publicar...', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2 },
  scheduled: { label: 'Agendado', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: Calendar },
  approved: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: FileText },
  waiting_for_approval: { label: 'A aguardar', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock },
  requires_attention: { label: 'Atenção', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
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

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['all', 'success', 'failed', 'pending'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const { data: attempts, isLoading: attemptsLoading, refetch: refetchAttempts } = useQuery({
    queryKey: ['publication-attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publication_attempts')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as PublicationAttempt[];
    },
  });

  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ['publication-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, tema, caption, caption_edited, status, post_type, selected_networks, template_a_images, media_items, scheduled_date, published_at, failed_at, created_at, origin_mode, error_log, first_comment, linkedin_body, hashtags, external_post_ids')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as PostRecord[];
    },
  });

  const isLoading = attemptsLoading || postsLoading;

  const refetch = () => {
    refetchAttempts();
    refetchPosts();
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

  const getExternalUrl = (responseData: any) => {
    if (!responseData) return undefined;
    return responseData?.url || responseData?.postUrl || responseData?.permalink || 
           responseData?.data?.url || responseData?.data?.permalink;
  };

  // Build consolidated history: one entry per post, with platform results grouped
  const consolidatedHistory = useMemo(() => {
    const postsMap = new Map<string, PostRecord>();
    for (const post of posts || []) {
      postsMap.set(post.id, post);
    }

    // Group attempts by post_id
    const attemptsByPost = new Map<string, PublicationAttempt[]>();
    const orphanAttempts: PublicationAttempt[] = [];

    for (const attempt of attempts || []) {
      if (attempt.post_id) {
        if (!attemptsByPost.has(attempt.post_id)) attemptsByPost.set(attempt.post_id, []);
        attemptsByPost.get(attempt.post_id)!.push(attempt);
      } else {
        orphanAttempts.push(attempt);
      }
    }

    const items: ConsolidatedItem[] = [];
    const processedPostIds = new Set<string>();

    // Process posts that have attempts — create consolidated entries
    for (const [postId, postAttempts] of attemptsByPost) {
      processedPostIds.add(postId);
      const post = postsMap.get(postId);

      // DEDUPLICATION: keep only the best record per platform+format
      const dedupedMap = new Map<string, PublicationAttempt>();
      for (const a of postAttempts) {
        const key = `${a.platform}-${a.format || ''}`;
        const existing = dedupedMap.get(key);
        if (!existing || (a.status !== 'pending' && existing.status === 'pending')) {
          dedupedMap.set(key, a);
        }
      }
      const dedupedAttempts = Array.from(dedupedMap.values());

      const hasSuccess = dedupedAttempts.some(a => a.status === 'success');
      const hasFailed = dedupedAttempts.some(a => a.status === 'failed');
      const hasPending = dedupedAttempts.some(a => a.status === 'pending');

      let overallStatus = 'pending';
      if (hasSuccess && hasFailed) overallStatus = 'partial';
      else if (hasSuccess) overallStatus = 'published';
      else if (hasFailed) overallStatus = 'failed';
      else if (hasPending) overallStatus = 'publishing';

      const cleanImages = (post?.template_a_images || []).filter(u => u !== 'placeholder-pending-upload');
      const externalIds = (post?.external_post_ids as Record<string, string>) || {};

      const successCount = dedupedAttempts.filter(a => a.status === 'success').length;
      const totalPlatforms = dedupedAttempts.length;

      items.push({
        id: `post-${postId}`,
        post_id: postId,
        caption: post?.caption,
        tema: post?.tema,
        image_url: cleanImages[0],
        media_urls: cleanImages,
        origin_mode: post?.origin_mode || undefined,
        hashtags: post?.hashtags || [],
        post_type: post?.post_type || undefined,
        timestamp: dedupedAttempts[0].attempted_at,
        overallStatus,
        error_message: post?.error_log || undefined,
        successCount,
        totalPlatforms,
        platforms: dedupedAttempts.map(a => ({
          platform: a.platform,
          format: a.format,
          status: a.status,
          error_message: a.error_message,
          response_data: a.response_data,
          external_url: getExternalUrl(a.response_data) || externalIds[a.platform],
          attempted_at: a.attempted_at,
        })),
      });
    }

    // Process posts WITHOUT attempts (drafts, scheduled, publishing, etc.)
    for (const post of posts || []) {
      if (processedPostIds.has(post.id)) continue;

      const showableStatuses = [
        'publishing', 'published', 'failed', 'scheduled', 
        'approved', 'rejected', 'pending', 'waiting_for_approval', 
        'draft', 'requires_attention'
      ];
      if (!post.status || !showableStatuses.includes(post.status)) continue;

      const networks = post.selected_networks || [];
      const cleanImages = (post.template_a_images || []).filter(u => u !== 'placeholder-pending-upload');
      const externalIds = (post.external_post_ids as Record<string, string>) || {};

      items.push({
        id: `post-${post.id}`,
        post_id: post.id,
        caption: post.caption,
        tema: post.tema,
        image_url: cleanImages[0],
        media_urls: cleanImages,
        origin_mode: post.origin_mode || undefined,
        hashtags: post.hashtags || [],
        timestamp: post.published_at || post.failed_at || post.created_at || new Date().toISOString(),
        overallStatus: post.status,
        error_message: post.error_log || undefined,
        platforms: networks.length > 0 
          ? networks.map(n => ({
              platform: n,
              format: post.post_type,
              status: post.status!,
              error_message: post.error_log,
              external_url: externalIds[n],
              attempted_at: post.published_at || post.created_at || new Date().toISOString(),
            }))
          : [{
              platform: 'instagram',
              format: post.post_type,
              status: post.status!,
              error_message: post.error_log,
              external_url: undefined,
              attempted_at: post.published_at || post.created_at || new Date().toISOString(),
            }],
      });
    }

    // Process orphan attempts (no post_id)
    for (const attempt of orphanAttempts) {
      items.push({
        id: `attempt-${attempt.id}`,
        post_id: null,
        timestamp: attempt.attempted_at,
        overallStatus: attempt.status,
        error_message: attempt.error_message,
        platforms: [{
          platform: attempt.platform,
          format: attempt.format,
          status: attempt.status,
          error_message: attempt.error_message,
          response_data: attempt.response_data,
          external_url: getExternalUrl(attempt.response_data),
          attempted_at: attempt.attempted_at,
        }],
      });
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Detect duplicates: same caption within 30 minutes (O(n log n) via Map)
    const THIRTY_MIN = 30 * 60 * 1000;
    const captionGroups = new Map<string, number[]>();
    items.forEach((item, idx) => {
      if (!item.caption?.trim()) return;
      const key = item.caption;
      if (!captionGroups.has(key)) captionGroups.set(key, []);
      captionGroups.get(key)!.push(idx);
    });
    captionGroups.forEach((indices) => {
      if (indices.length < 2) return;
      for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
          const diff = Math.abs(
            new Date(items[indices[i]].timestamp).getTime() - 
            new Date(items[indices[j]].timestamp).getTime()
          );
          if (diff <= THIRTY_MIN) {
            items[indices[i]].isDuplicate = true;
            items[indices[j]].isDuplicate = true;
          }
        }
      }
    });

    return items;
  }, [attempts, posts]);

  // Stats based on unique consolidated items
  const stats = useMemo(() => {
    const total = consolidatedHistory.length;
    const success = consolidatedHistory.filter(i => ['success', 'published'].includes(i.overallStatus)).length;
    const failed = consolidatedHistory.filter(i => i.overallStatus === 'failed').length;
    const partial = consolidatedHistory.filter(i => i.overallStatus === 'partial').length;
    const pending = consolidatedHistory.filter(i => ['pending', 'publishing', 'scheduled'].includes(i.overallStatus)).length;
    return { total, success, failed, partial, pending };
  }, [consolidatedHistory]);

  // Filter
  const filteredItems = useMemo(() => {
    return consolidatedHistory.filter(item => {
      // Tab filter
      if (activeTab === 'success' && !['success', 'published', 'partial'].includes(item.overallStatus)) return false;
      if (activeTab === 'failed' && !['failed', 'partial'].includes(item.overallStatus)) return false;
      if (activeTab === 'pending' && !['pending', 'publishing', 'scheduled'].includes(item.overallStatus)) return false;

      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        const itemDate = new Date(item.timestamp);
        if (dateFilter === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (itemDate < today) return false;
        } else if (dateFilter === 'week') {
          if (itemDate < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) return false;
        } else if (dateFilter === 'month') {
          if (itemDate < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) return false;
        }
      }

      // Platform filter
      if (platformFilter !== 'all') {
        if (!item.platforms.some(p => p.platform === platformFilter)) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && item.overallStatus !== statusFilter) return false;

      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesCaption = item.caption?.toLowerCase().includes(term);
        const matchesTema = item.tema?.toLowerCase().includes(term);
        const matchesPlatform = item.platforms.some(p => p.platform.toLowerCase().includes(term));
        const matchesError = item.platforms.some(p => p.error_message?.toLowerCase().includes(term));
        if (!matchesCaption && !matchesTema && !matchesPlatform && !matchesError) return false;
      }

      return true;
    });
  }, [consolidatedHistory, activeTab, searchTerm, statusFilter, platformFilter, dateFilter]);

  // Group by date
  const groupedItems = useMemo(() => {
    const groups: Record<string, ConsolidatedItem[]> = {};
    filteredItems.forEach(item => {
      const date = format(new Date(item.timestamp), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [filteredItems]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedItems(newExpanded);
  };

  const renderPlatformBadge = (pr: PlatformResult) => {
    const Icon = platformIcons[pr.platform] || FileText;
    const isSuccess = pr.status === 'success' || pr.status === 'published';
    const isFailed = pr.status === 'failed';
    
    return (
      <div 
        key={`${pr.platform}-${pr.format}`}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
          isSuccess && "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
          isFailed && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
          !isSuccess && !isFailed && "bg-muted text-muted-foreground border-border"
        )}
      >
        <Icon className="h-3 w-3" />
        <span className="capitalize">{pr.platform}</span>
        {isSuccess && <CheckCircle2 className="h-3 w-3" />}
        {isFailed && <XCircle className="h-3 w-3" />}
      </div>
    );
  };

  const renderItemCard = (item: ConsolidatedItem) => {
    const statusInfo = statusConfig[item.overallStatus] || statusConfig.pending;
    const StatusIcon = statusInfo.icon;
    const isExpanded = expandedItems.has(item.id);
    const isStuck = item.overallStatus === 'publishing' && new Date(item.timestamp) < new Date(Date.now() - 10 * 60 * 1000);
    const timeStr = format(new Date(item.timestamp), 'HH:mm', { locale: pt });

    // Pick the first platform icon for the main card
    const mainPlatform = item.platforms[0]?.platform || 'instagram';
    const MainIcon = platformIcons[mainPlatform] || FileText;

    return (
      <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
        <Card className={cn(
          "transition-all duration-200 hover:shadow-md",
          item.overallStatus === 'failed' && "border-red-200 dark:border-red-900/50",
          ['success', 'published'].includes(item.overallStatus) && "border-green-200 dark:border-green-900/50",
          item.overallStatus === 'partial' && "border-orange-200 dark:border-orange-900/50",
          item.overallStatus === 'publishing' && "border-blue-200 dark:border-blue-900/50"
        )}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Image preview */}
                  {item.image_url ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      <img 
                        src={item.image_url} 
                        alt="" 
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className={cn(
                      "h-12 w-12 rounded-lg flex items-center justify-center text-white shadow-sm flex-shrink-0",
                      platformColors[mainPlatform] || 'bg-gray-500'
                    )}>
                      <MainIcon className="h-6 w-6" />
                    </div>
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm font-semibold truncate">
                        {item.tema || item.caption?.substring(0, 60) || 'Publicação'}
                      </CardTitle>
                    </div>
                    {/* Summary line */}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {timeStr}
                      {item.post_type && ` · ${getFormatLabel(item.post_type)}`}
                      {item.totalPlatforms && item.totalPlatforms > 0 && (
                        <> · {item.successCount}/{item.totalPlatforms} {item.totalPlatforms === 1 ? 'rede' : 'redes'}</>
                      )}
                    </p>
                    {/* Platform badges row */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {item.platforms.map(renderPlatformBadge)}
                      {item.origin_mode && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {item.origin_mode === 'manual' ? 'Manual' : 'Auto'}
                        </Badge>
                      )}
                      {item.isDuplicate && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-0.5 cursor-help">
                                <Copy className="h-2.5 w-2.5" />
                                Possível duplicado
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              Mesma legenda publicada mais do que uma vez num intervalo de 30 minutos
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isStuck ? (
                    <Badge className="gap-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                      <AlertTriangle className="h-3 w-3" />
                      Interrompido?
                    </Badge>
                  ) : (
                    <Badge className={cn("gap-1", statusInfo.color)}>
                      <StatusIcon className={cn("h-3 w-3", item.overallStatus === 'publishing' && "animate-spin")} />
                      {statusInfo.label}
                    </Badge>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
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

                {/* Caption */}
                {item.caption && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Legenda:</p>
                    <p className="text-sm line-clamp-3">{item.caption}</p>
                  </div>
                )}

                {/* Platform-by-platform details */}
                {item.platforms.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Detalhes por plataforma:</p>
                    {item.platforms.map((pr, idx) => {
                      const PlatIcon = platformIcons[pr.platform] || FileText;
                      const prStatus = statusConfig[pr.status] || statusConfig.pending;
                      return (
                        <div key={idx} className="flex items-start gap-3 bg-muted/20 rounded-lg p-3 border border-border/50">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center text-white flex-shrink-0",
                            platformColors[pr.platform] || 'bg-gray-500'
                          )}>
                            <PlatIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium capitalize">{pr.platform}</span>
                              {pr.format && <Badge variant="outline" className="text-[10px]">{getFormatLabel(pr.format)}</Badge>}
                              <Badge className={cn("text-[10px]", prStatus.color)}>{prStatus.label}</Badge>
                            </div>
                            {pr.error_message && (
                              <div className="mt-1 flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-red-600 dark:text-red-400 break-all">{pr.error_message}</p>
                              </div>
                            )}
                            {pr.external_url && pr.status === 'success' && (
                              <a href={pr.external_url} target="_blank" rel="noopener noreferrer" 
                                className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                                onClick={e => e.stopPropagation()}>
                                <ExternalLink className="h-3 w-3" /> Ver publicação
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Post-level error */}
                {item.error_message && !item.platforms.some(p => p.error_message === item.error_message) && (() => {
                  // Try to parse structured upload error
                  let parsed: any = null;
                  try { parsed = JSON.parse(item.error_message!); } catch {}
                  
                  if (parsed?.tipo === 'upload_error') {
                    return (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-semibold text-red-700 dark:text-red-300">{parsed.causa}</p>
                            <p className="text-sm text-red-600 dark:text-red-400">{parsed.detalhe}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>Original: <code className="bg-muted px-1 rounded">{parsed.nome_original}</code></span>
                              <span>· {parsed.tamanho_mb}MB · {parsed.tipo_ficheiro}</span>
                            </div>
                            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mt-1">💡 {parsed.sugestao}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-300 break-all">{item.error_message}</p>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Post ID */}
                {item.post_id && (
                  <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                    Post ID: {item.post_id}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {item.media_urls && item.media_urls.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          toast.loading('A preparar download...', { id: 'download' });
                          await downloadPublicationAssets(item.media_urls || [], item.caption || '', item.tema, item.hashtags);
                          toast.success('Download concluído!', { id: 'download' });
                        } catch {
                          toast.error('Erro ao descarregar', { id: 'download' });
                        }
                      }}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  )}
                  
                  {item.post_id && (
                    <Button
                      variant={item.overallStatus === 'failed' || item.overallStatus === 'partial' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => navigate(`/manual-create?recover=${item.post_id}`)}
                      className="gap-2 flex-1"
                    >
                      {item.overallStatus === 'failed' || item.overallStatus === 'partial' ? (
                        <><RotateCcw className="h-4 w-4" /> Tentar Novamente</>
                      ) : (
                        <><Copy className="h-4 w-4" /> Reutilizar Conteúdo</>
                      )}
                    </Button>
                  )}
                </div>
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
            <p className="text-sm text-muted-foreground">Centro de comando — registo de todas as publicações e tentativas</p>
          </div>
        </div>
        
        <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </Card>
        <Card className="p-4 border-green-200 dark:border-green-900/50">
          <div className="text-2xl font-bold text-green-600">{stats.success}</div>
          <div className="text-xs text-muted-foreground">Sucesso</div>
        </Card>
        <Card className="p-4 border-orange-200 dark:border-orange-900/50">
          <div className="text-2xl font-bold text-orange-600">{stats.partial}</div>
          <div className="text-xs text-muted-foreground">Parcial</div>
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
          <TabsTrigger value="all" className="gap-1"><History className="h-4 w-4" />Tudo</TabsTrigger>
          <TabsTrigger value="success" className="gap-1"><CheckCircle2 className="h-4 w-4" />Sucesso</TabsTrigger>
          <TabsTrigger value="failed" className="gap-1"><XCircle className="h-4 w-4" />Falhas</TabsTrigger>
          <TabsTrigger value="pending" className="gap-1"><Clock className="h-4 w-4" />Pendentes</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por tema, legenda, plataforma ou erro..."
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
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
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
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
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
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' || platformFilter !== 'all' || activeTab !== 'all'
              ? 'Nenhuma publicação encontrada com os filtros aplicados'
              : 'As tuas publicações aparecerão aqui quando publicares algo'}
          </p>
          {!searchTerm && statusFilter === 'all' && platformFilter === 'all' && activeTab === 'all' && (
            <Button onClick={() => navigate('/manual-create')} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar nova publicação
            </Button>
          )}
        </Card>
      ) : (
        <ScrollArea className="min-h-[300px] max-h-[calc(100vh-420px)] pr-4">
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
