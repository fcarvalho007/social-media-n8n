import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Image,
  Video,
  Star,
  Search,
  Download,
  Trash2,
  Copy,
  Sparkles,
  Upload,
  Grid3x3,
  RefreshCw,
  FolderOpen,
  HardDrive,
  Calendar,
  FileType,
  Eye,
  MoreVertical,
  CheckCircle2,
  X,
  FileText,
  ExternalLink,
  ImageOff,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MediaItem {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  aspect_ratio: string | null;
  thumbnail_url: string | null;
  tags: string[] | null;
  source: string | null;
  ai_prompt: string | null;
  is_favorite: boolean | null;
  created_at: string;
  updated_at: string;
  publication_url: string | null;
  post_id: string | null;
}

// Helper to detect if URL is a PDF
const isPdfUrl = (url: string) => url.toLowerCase().endsWith('.pdf');

// Helper to check if item is a video (supports both 'video' and 'video/...' formats)
const isVideoItem = (item: MediaItem) => 
  item.file_type === 'video' || item.file_type.startsWith('video/');

// Helper to check if item is an image (supports both 'image' and 'image/...' formats)
const isImageItem = (item: MediaItem) => 
  item.file_type === 'image' || item.file_type.startsWith('image/');

const sourceLabels: Record<string, string> = {
  upload: 'Upload',
  ai: 'IA',
  publication: 'Publicação',
  'grid-splitter': 'Grid Splitter',
};

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  upload: Upload,
  ai: Sparkles,
  publication: Image,
  'grid-splitter': Grid3x3,
};

// Calculate days remaining before file expires (7-day retention)
const getDaysRemaining = (createdAt: string): number => {
  const expiresAt = addDays(new Date(createdAt), 7);
  return Math.max(0, differenceInDays(expiresAt, new Date()));
};

export default function MediaLibrary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [detailsItem, setDetailsItem] = useState<MediaItem | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasAutoSynced, setHasAutoSynced] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch media library
  const { data: mediaItems, isLoading, refetch } = useQuery({
    queryKey: ['media-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MediaItem[];
    },
    enabled: !!user,
  });

  // Import existing publications into media library
  const importExistingPublications = async () => {
    if (!user) return;
    
    setIsImporting(true);
    let successCount = 0;
    let failedCount = 0;
    
    try {
      // Fetch posts with ALL relevant statuses (not just published/approved)
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, template_a_images, media_items, created_at, published_at, status')
        .in('status', ['published', 'approved', 'scheduled', 'waiting_for_approval', 'failed', 'publishing', 'pending'])
        .or('template_a_images.not.is.null,media_items.not.is.null');
      
      if (postsError) {
        toast.error(`Erro ao buscar publicações: ${postsError.message}`);
        throw postsError;
      }
      
      // Also fetch drafts
      const { data: drafts, error: draftsError } = await supabase
        .from('posts_drafts')
        .select('id, user_id, media_urls, created_at')
        .eq('status', 'draft');
      
      if (draftsError) {
        console.warn('Could not fetch drafts:', draftsError);
      }
      
      const totalPosts = (posts?.length || 0) + (drafts?.length || 0);
      
      if (totalPosts === 0) {
        toast.info('Nenhuma publicação ou rascunho encontrado para importar');
        return;
      }

      // Get existing URLs in media library to avoid duplicates
      const { data: existingMedia } = await supabase
        .from('media_library')
        .select('file_url');
      
      const existingUrls = new Set((existingMedia || []).map(m => m.file_url));
      
      const entriesToInsert: Array<{
        user_id: string;
        file_name: string;
        file_url: string;
        file_type: string;
        source: string;
        is_favorite: boolean;
        created_at: string;
      }> = [];
      
      // Process posts
      for (const post of (posts || [])) {
        const allUrls: string[] = [];
        
        if (post.template_a_images && Array.isArray(post.template_a_images)) {
          allUrls.push(...(post.template_a_images as string[]));
        }
        
        if (post.media_items && Array.isArray(post.media_items)) {
          for (const item of post.media_items as Array<{ url?: string; preview?: string }>) {
            if (item.url) allUrls.push(item.url);
            else if (item.preview) allUrls.push(item.preview);
          }
        }
        
        for (const url of allUrls) {
          if (!url || existingUrls.has(url)) continue;
          if (url.includes('media.getlate.dev/temp/')) continue;
          
          const fileName = url.split('/').pop() || `imported-${entriesToInsert.length}`;
          const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
          
          entriesToInsert.push({
            user_id: post.user_id || user.id,
            file_name: fileName,
            file_url: url,
            file_type: isVideo ? 'video' : 'image',
            source: 'publication',
            is_favorite: false,
            created_at: post.published_at || post.created_at || new Date().toISOString(),
          });
          
          existingUrls.add(url);
        }
      }
      
      // Process drafts
      for (const draft of (drafts || [])) {
        if (!draft.media_urls || !Array.isArray(draft.media_urls)) continue;
        
        for (const item of draft.media_urls) {
          let url: string | null = null;
          if (typeof item === 'string') url = item;
          else if (item && typeof item === 'object') url = (item as { url?: string }).url || null;
          
          if (!url || existingUrls.has(url)) continue;
          if (url.includes('media.getlate.dev/temp/')) continue;
          
          const fileName = url.split('/').pop() || `draft-${entriesToInsert.length}`;
          const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
          
          entriesToInsert.push({
            user_id: draft.user_id || user.id,
            file_name: fileName,
            file_url: url,
            file_type: isVideo ? 'video' : 'image',
            source: 'publication',
            is_favorite: false,
            created_at: draft.created_at || new Date().toISOString(),
          });
          
          existingUrls.add(url);
        }
      }
      
      if (entriesToInsert.length === 0) {
        toast.info('Todas as publicações já estão na biblioteca');
        return;
      }
      
      // Insert in batches of 50 with proper error handling
      const batchSize = 50;
      for (let i = 0; i < entriesToInsert.length; i += batchSize) {
        const batch = entriesToInsert.slice(i, i + batchSize);
        const { error: insertError, data: insertedData } = await supabase
          .from('media_library')
          .insert(batch)
          .select();
        
        if (insertError) {
          console.error('Batch insert error:', insertError);
          failedCount += batch.length;
          toast.warning(`Erro ao importar lote ${Math.floor(i/batchSize) + 1}: ${insertError.message}`);
        } else {
          successCount += insertedData?.length || batch.length;
        }
        
        // Show progress
        const progress = Math.round(((i + batch.length) / entriesToInsert.length) * 100);
        toast.loading(`A importar... ${progress}%`, { id: 'import-progress' });
      }
      
      toast.dismiss('import-progress');
      await refetch();
      
      // Show final result
      if (failedCount > 0) {
        toast.warning(`Importação parcial: ${successCount} ficheiros importados, ${failedCount} falharam`);
      } else {
        toast.success(`${successCount} ficheiro(s) importado(s) com sucesso!`);
      }
      
      // Switch to publications tab
      setActiveTab('publications');
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar publicações. Verifique a consola para detalhes.');
    } finally {
      setIsImporting(false);
      toast.dismiss('import-progress');
    }
  };

  // Sync from Getlate API
  const syncFromGetlate = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    const toastId = toast.loading('A sincronizar com Getlate...');
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-getlate-posts', {
        body: {
          date_from: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // Last 6 months
        },
      });
      
      if (error) throw error;
      
      toast.dismiss(toastId);
      
      if (data.synced > 0 || data.syncedMedia > 0) {
        toast.success(`Sincronizados ${data.synced} posts e ${data.syncedMedia} ficheiros`);
        await refetch();
      } else {
        toast.info('Biblioteca já está atualizada');
      }
      
      // Store last sync timestamp
      localStorage.setItem('getlate_last_sync_at', new Date().toISOString());
    } catch (error) {
      console.error('Sync error:', error);
      toast.dismiss(toastId);
      toast.error('Erro ao sincronizar com Getlate');
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync when library is empty (no prompts, automatic)
  useEffect(() => {
    if (!isLoading && mediaItems && mediaItems.length === 0 && user && !hasAutoSynced && !isSyncing) {
      setHasAutoSynced(true);
      
      // Check last sync time to avoid excessive syncs
      const lastSync = localStorage.getItem('getlate_last_sync_at');
      const shouldSync = !lastSync || (Date.now() - new Date(lastSync).getTime() > 30 * 60 * 1000); // 30 min
      
      if (shouldSync) {
        // Auto-trigger sync
        syncFromGetlate().then(() => {
          // After getlate sync, also import from existing posts/drafts
          importExistingPublications();
        });
      } else {
        // Just import from local database
        importExistingPublications();
      }
    }
  }, [isLoading, mediaItems, user, hasAutoSynced, isSyncing]);

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('media_library')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
    },
  });

  // Delete mutation - also removes files from storage
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // 1. Get items to delete (we need their URLs)
      const itemsToDelete = mediaItems?.filter(item => ids.includes(item.id)) || [];
      
      // 2. Delete files from storage buckets
      for (const item of itemsToDelete) {
        const url = item.file_url;
        
        // Check if this is a URL from our Supabase storage
        if (url.includes('supabase.co/storage/')) {
          try {
            // Extract bucket and path from URL
            // Format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file.ext
            const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
            if (match) {
              const [, bucket, filePath] = match;
              const decodedPath = decodeURIComponent(filePath);
              
              const { error: storageError } = await supabase.storage
                .from(bucket)
                .remove([decodedPath]);
                
              if (storageError) {
                console.warn(`[MediaLibrary] Failed to delete from ${bucket}:`, storageError);
              } else {
                console.log(`[MediaLibrary] Deleted from ${bucket}: ${decodedPath}`);
              }
            }
          } catch (storageError) {
            console.warn(`[MediaLibrary] Storage delete error:`, storageError);
            // Continue even if storage delete fails - we still want to remove DB record
          }
        }
      }
      
      // 3. Delete records from database
      const { error } = await supabase
        .from('media_library')
        .delete()
        .in('id', ids);
        
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
      setSelectedItems(new Set());
      setShowDeleteConfirm(false);
      toast.success(`${ids.length} ficheiro(s) eliminado(s) permanentemente`);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Erro ao eliminar ficheiros');
    },
  });

  // Filter and sort items
  const filteredItems = useMemo(() => {
    if (!mediaItems) return [];

    let items = [...mediaItems];

    // Tab filter
    if (activeTab === 'favorites') {
      items = items.filter(item => item.is_favorite);
    } else if (activeTab === 'images') {
      items = items.filter(item => isImageItem(item));
    } else if (activeTab === 'videos') {
      items = items.filter(item => isVideoItem(item));
    } else if (activeTab === 'ai') {
      items = items.filter(item => item.source === 'ai');
    } else if (activeTab === 'publications') {
      items = items.filter(item => item.source === 'publication');
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item => 
        item.file_name.toLowerCase().includes(term) ||
        item.ai_prompt?.toLowerCase().includes(term) ||
        item.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Sort
    items.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'name') {
        return a.file_name.localeCompare(b.file_name);
      } else if (sortBy === 'size') {
        return (b.file_size || 0) - (a.file_size || 0);
      }
      return 0;
    });

    return items;
  }, [mediaItems, activeTab, searchTerm, sortBy]);

  // Stats
  const stats = useMemo(() => {
    if (!mediaItems) return { total: 0, favorites: 0, totalSize: 0, videos: 0, images: 0 };
    return {
      total: mediaItems.length,
      favorites: mediaItems.filter(m => m.is_favorite).length,
      totalSize: mediaItems.reduce((acc, m) => acc + (m.file_size || 0), 0),
      videos: mediaItems.filter(m => isVideoItem(m)).length,
      images: mediaItems.filter(m => isImageItem(m)).length,
    };
  }, [mediaItems]);

  // Format file size
  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Toggle item selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Select all visible
  const selectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  // Copy URL to clipboard
  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success('URL copiado');
  };

  // Download file
  const downloadFile = async (item: MediaItem) => {
    try {
      const response = await fetch(item.file_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download iniciado');
    } catch (error) {
      toast.error('Erro ao fazer download');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-primary" />
              Biblioteca de Média
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.total} ficheiros • {stats.images} imagens • {stats.videos} vídeos • {formatSize(stats.totalSize)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={importExistingPublications}
              disabled={isImporting}
            >
              {isImporting ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Importar publicações
            </Button>
            
            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={selectAll}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {selectedItems.size === filteredItems.length && filteredItems.length > 0 
                    ? 'Desselecionar todos' 
                    : `Selecionar todos (${filteredItems.length})`}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (filteredItems.length > 0) {
                      setSelectedItems(new Set(filteredItems.map(item => item.id)));
                      setShowDeleteConfirm(true);
                    }
                  }}
                  disabled={filteredItems.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar tudo ({filteredItems.length})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Retention warning */}
      <div className="px-4 md:px-6 py-2 border-b bg-amber-500/10 border-amber-500/20">
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>Os ficheiros são eliminados automaticamente após 7 dias para sustentabilidade do sistema</span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 py-3 border-b bg-muted/30">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid grid-cols-6 h-9">
              <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Favoritos
              </TabsTrigger>
              <TabsTrigger value="images" className="text-xs">
                <Image className="h-3 w-3 mr-1" />
                Imagens
              </TabsTrigger>
              <TabsTrigger value="videos" className="text-xs">
                <Video className="h-3 w-3 mr-1" />
                Vídeos
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                IA
              </TabsTrigger>
              <TabsTrigger value="publications" className="text-xs">
                <Upload className="h-3 w-3 mr-1" />
                Publicações
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="size">Tamanho</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-4 md:px-6 py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FolderOpen className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum ficheiro encontrado</p>
            <p className="text-sm">Os ficheiros que enviar ou gerar com IA aparecerão aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredItems.map((item) => {
              const isSelected = selectedItems.has(item.id);
              const SourceIcon = sourceIcons[item.source || 'upload'] || Upload;
              const isVideo = isVideoItem(item);

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "group relative overflow-hidden cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-primary/50",
                    isSelected && "ring-2 ring-primary"
                  )}
                  onClick={() => setDetailsItem(item)}
                >
                  <CardContent className="p-0">
                    {/* Selection checkbox */}
                    <div 
                      className={cn(
                        "absolute top-2 left-2 z-10 transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(item.id);
                      }}
                    >
                      <Checkbox checked={isSelected} />
                    </div>

                    {/* Favorite button */}
                    <button
                      className={cn(
                        "absolute top-2 right-2 z-10 h-7 w-7 rounded-full flex items-center justify-center transition-all",
                        item.is_favorite
                          ? "bg-yellow-500 text-white"
                          : "bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteMutation.mutate({ id: item.id, isFavorite: !!item.is_favorite });
                      }}
                    >
                      <Star className={cn("h-4 w-4", item.is_favorite && "fill-current")} />
                    </button>

                    {/* Media preview */}
                    <div className="aspect-square bg-muted">
                      {isPdfUrl(item.file_url) ? (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-muted">
                          <FileText className="h-12 w-12 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground mt-2">PDF</span>
                        </div>
                      ) : isVideo ? (
                        <div className="relative h-full w-full bg-black">
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.file_name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const videoEl = e.currentTarget.parentElement?.querySelector('video');
                                if (videoEl) videoEl.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <video
                            src={item.file_url}
                            preload="metadata"
                            muted
                            playsInline
                            className={cn(
                              "h-full w-full object-cover",
                              item.thumbnail_url && "hidden"
                            )}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const expired = e.currentTarget.parentElement?.querySelector('[data-expired-fallback]') as HTMLElement;
                              if (expired) expired.classList.remove('hidden');
                            }}
                          />
                          {/* Expired fallback */}
                          <div data-expired-fallback className="absolute inset-0 flex flex-col items-center justify-center bg-muted hidden">
                            <AlertTriangle className="h-8 w-8 text-destructive/60" />
                            <span className="text-[10px] text-destructive/80 mt-1">Ficheiro expirado</span>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/50 rounded-full p-2">
                              <Video className="h-5 w-5 text-white" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-full w-full">
                          <img
                            src={item.thumbnail_url || item.file_url}
                            alt={item.file_name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden h-full w-full flex-col items-center justify-center bg-muted">
                            <ImageOff className="h-10 w-10 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground mt-1">Erro ao carregar</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expiration badge */}
                    {(() => {
                      const daysLeft = getDaysRemaining(item.created_at);
                      if (daysLeft <= 2) return (
                        <div className="absolute bottom-2 left-2 z-10">
                          <Badge className="text-[10px] h-5 bg-destructive/90 text-destructive-foreground border-0">
                            <Clock className="h-3 w-3 mr-0.5" />
                            Expira em {daysLeft}d
                          </Badge>
                        </div>
                      );
                      if (daysLeft <= 4) return (
                        <div className="absolute bottom-2 left-2 z-10">
                          <Badge className="text-[10px] h-5 bg-amber-500/90 text-white border-0">
                            <Clock className="h-3 w-3 mr-0.5" />
                            {daysLeft}d restantes
                          </Badge>
                        </div>
                      );
                      return null;
                    })()}

                    {/* Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-white text-xs font-medium truncate">{item.file_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                          <SourceIcon className="h-3 w-3" />
                          {sourceLabels[item.source || 'upload']}
                        </Badge>
                        {isVideo && (
                          <Badge variant="outline" className="text-[10px] h-5 text-white/80 border-white/30">
                            <Video className="h-3 w-3 mr-1" />
                            Vídeo
                          </Badge>
                        )}
                        {item.aspect_ratio && (
                          <Badge variant="outline" className="text-[10px] h-5 text-white/80 border-white/30">
                            {item.aspect_ratio}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Floating action bar when items selected */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border shadow-lg rounded-full px-6 py-3 flex items-center gap-4">
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {selectedItems.size} selecionado(s)
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedItems(new Set())}
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar {selectedItems.size}
          </Button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {selectedItems.size} ficheiro(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Os ficheiros serão eliminados permanentemente 
              da biblioteca e do armazenamento cloud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteMutation.mutate(Array.from(selectedItems));
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  A eliminar...
                </>
              ) : (
                'Eliminar permanentemente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog */}
      <Dialog open={!!detailsItem} onOpenChange={(open) => !open && setDetailsItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailsItem && isVideoItem(detailsItem) ? (
                <Video className="h-5 w-5" />
              ) : (
                <Image className="h-5 w-5" />
              )}
              Detalhes do Ficheiro
            </DialogTitle>
            <DialogDescription>
              {detailsItem?.file_name}
            </DialogDescription>
          </DialogHeader>

          {detailsItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preview */}
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                {isPdfUrl(detailsItem.file_url) ? (
                  <div className="h-full w-full flex flex-col items-center justify-center bg-muted">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground mt-2">Documento PDF</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => window.open(detailsItem.file_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Abrir PDF
                    </Button>
                  </div>
                ) : isVideoItem(detailsItem) ? (
                  <video
                    src={detailsItem.file_url}
                    controls
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <img
                    src={detailsItem.file_url}
                    alt={detailsItem.file_name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                )}
                <div className="hidden h-full w-full flex-col items-center justify-center">
                  <ImageOff className="h-12 w-12 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground mt-2">Não foi possível carregar</span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(detailsItem.created_at), "dd MMM yyyy 'às' HH:mm", { locale: pt })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className={cn(
                      "h-4 w-4",
                      getDaysRemaining(detailsItem.created_at) <= 2 ? "text-destructive" : "text-amber-500"
                    )} />
                    <span className={cn(
                      getDaysRemaining(detailsItem.created_at) <= 2 && "text-destructive font-medium"
                    )}>
                      Expira em {format(addDays(new Date(detailsItem.created_at), 7), "dd MMM yyyy", { locale: pt })} ({getDaysRemaining(detailsItem.created_at)}d restantes)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span>{formatSize(detailsItem.file_size)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileType className="h-4 w-4 text-muted-foreground" />
                    <span>{detailsItem.file_type}</span>
                  </div>
                  {detailsItem.width && detailsItem.height && (
                    <div className="flex items-center gap-2 text-sm">
                      <Grid3x3 className="h-4 w-4 text-muted-foreground" />
                      <span>{detailsItem.width} × {detailsItem.height}</span>
                    </div>
                  )}
                  {detailsItem.aspect_ratio && (
                    <Badge variant="secondary" className="mt-2">
                      {detailsItem.aspect_ratio}
                    </Badge>
                  )}
                </div>

                {detailsItem.ai_prompt && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Prompt IA
                    </p>
                    <p className="text-sm">{detailsItem.ai_prompt}</p>
                  </div>
                )}

                {detailsItem.tags && detailsItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {detailsItem.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {detailsItem.publication_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(detailsItem.publication_url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Ver publicação
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyUrl(detailsItem.file_url)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile(detailsItem)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toggleFavoriteMutation.mutate({ 
                        id: detailsItem.id, 
                        isFavorite: !!detailsItem.is_favorite 
                      });
                      setDetailsItem({
                        ...detailsItem,
                        is_favorite: !detailsItem.is_favorite
                      });
                    }}
                  >
                    <Star className={cn(
                      "h-4 w-4 mr-1",
                      detailsItem.is_favorite && "fill-yellow-500 text-yellow-500"
                    )} />
                    {detailsItem.is_favorite ? 'Remover favorito' : 'Adicionar favorito'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedItems(new Set([detailsItem.id]));
                      setDetailsItem(null);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
