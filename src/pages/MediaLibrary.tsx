import { useState, useMemo } from 'react';
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
  X
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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
}

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

export default function MediaLibrary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [detailsItem, setDetailsItem] = useState<MediaItem | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
    try {
      // Fetch published posts with images
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, template_a_images, created_at')
        .eq('status', 'published')
        .not('template_a_images', 'is', null);
      
      if (postsError) throw postsError;
      
      if (!posts || posts.length === 0) {
        toast.info('Nenhuma publicação encontrada para importar');
        return;
      }

      // Get existing URLs in media library to avoid duplicates
      const { data: existingMedia } = await supabase
        .from('media_library')
        .select('file_url');
      
      const existingUrls = new Set((existingMedia || []).map(m => m.file_url));
      
      let importCount = 0;
      const entriesToInsert: Array<{
        user_id: string;
        file_name: string;
        file_url: string;
        file_type: string;
        source: string;
        is_favorite: boolean;
        created_at: string;
      }> = [];
      
      for (const post of posts) {
        const urls = (post.template_a_images || []) as string[];
        
        for (const url of urls) {
          // Skip if already exists or empty
          if (!url || existingUrls.has(url)) continue;
          
          const fileName = url.split('/').pop() || `imported-${importCount}`;
          const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
          
          entriesToInsert.push({
            user_id: post.user_id || user.id,
            file_name: fileName,
            file_url: url,
            file_type: isVideo ? 'video/mp4' : 'image/jpeg',
            source: 'publication',
            is_favorite: false,
            created_at: post.created_at || new Date().toISOString(),
          });
          
          existingUrls.add(url); // Prevent duplicates within same import
          importCount++;
        }
      }
      
      if (entriesToInsert.length === 0) {
        toast.info('Todas as publicações já estão na biblioteca');
        return;
      }
      
      // Insert in batches of 50
      const batchSize = 50;
      for (let i = 0; i < entriesToInsert.length; i += batchSize) {
        const batch = entriesToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('media_library')
          .insert(batch);
        
        if (insertError) {
          console.error('Batch insert error:', insertError);
        }
      }
      
      await refetch();
      toast.success(`${importCount} ficheiro(s) importado(s) com sucesso!`);
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar publicações');
    } finally {
      setIsImporting(false);
    }
  };

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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('media_library')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
      setSelectedItems(new Set());
      toast.success(`${ids.length} ficheiro(s) eliminado(s)`);
    },
    onError: () => {
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
      items = items.filter(item => item.file_type.startsWith('image/'));
    } else if (activeTab === 'videos') {
      items = items.filter(item => item.file_type.startsWith('video/'));
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
    if (!mediaItems) return { total: 0, favorites: 0, totalSize: 0 };
    return {
      total: mediaItems.length,
      favorites: mediaItems.filter(m => m.is_favorite).length,
      totalSize: mediaItems.reduce((acc, m) => acc + (m.file_size || 0), 0),
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
              {stats.total} ficheiros • {stats.favorites} favoritos • {formatSize(stats.totalSize)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedItems.size > 0 && (
              <>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {selectedItems.size} selecionados
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(Array.from(selectedItems))}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItems(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
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
          </div>
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
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedItems.size === filteredItems.length && filteredItems.length > 0 ? 'Desselecionar' : 'Selecionar todos'}
            </Button>
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
              const isVideo = item.file_type.startsWith('video/');

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
                      {isVideo ? (
                        <div className="relative h-full w-full">
                          <video
                            src={item.file_url}
                            className="h-full w-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Video className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.thumbnail_url || item.file_url}
                          alt={item.file_name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>

                    {/* Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-white text-xs font-medium truncate">{item.file_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                          <SourceIcon className="h-3 w-3" />
                          {sourceLabels[item.source || 'upload']}
                        </Badge>
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

      {/* Details Dialog */}
      <Dialog open={!!detailsItem} onOpenChange={(open) => !open && setDetailsItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailsItem?.file_type.startsWith('video/') ? (
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
                {detailsItem.file_type.startsWith('video/') ? (
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
                  />
                )}
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
                      deleteMutation.mutate([detailsItem.id]);
                      setDetailsItem(null);
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
