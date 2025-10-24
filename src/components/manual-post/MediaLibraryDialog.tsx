import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MediaItem } from '@/types/social';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Star, Image as ImageIcon, Video, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (items: MediaItem[]) => void;
  maxSelection?: number;
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  onSelect,
  maxSelection = 10,
}: MediaLibraryDialogProps) {
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recent');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMedia();
    }
  }, [open]);

  useEffect(() => {
    filterMedia();
  }, [searchQuery, activeTab, mediaFiles]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMediaFiles(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast.error('Falha ao carregar biblioteca de média');
    } finally {
      setLoading(false);
    }
  };

  const filterMedia = () => {
    let filtered = [...mediaFiles];

    // Filter by tab
    if (activeTab === 'favorites') {
      filtered = filtered.filter(f => f.is_favorite);
    } else if (activeTab === 'images') {
      filtered = filtered.filter(f => f.file_type === 'image');
    } else if (activeTab === 'videos') {
      filtered = filtered.filter(f => f.file_type === 'video');
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(f =>
        f.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFiles(filtered);
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      if (selectedIds.size >= maxSelection) {
        toast.error(`Máximo de ${maxSelection} itens podem ser selecionados`);
        return;
      }
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleAddToPost = () => {
    const selectedFiles = mediaFiles.filter(f => selectedIds.has(f.id));
    const mediaItems: MediaItem[] = selectedFiles.map((file, index) => ({
      id: file.id,
      url: file.file_url,
      thumbnail_url: file.thumbnail_url,
      type: file.file_type,
      width: file.width,
      height: file.height,
      duration: file.duration,
      aspect_ratio: file.aspect_ratio,
      order: index,
    }));
    onSelect(mediaItems);
    onOpenChange(false);
    setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Biblioteca de Média</DialogTitle>
          <DialogDescription>
            Selecione até {maxSelection} itens para adicionar à sua publicação
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="recent">
                <Clock className="h-4 w-4 mr-2" />
                Recentes
              </TabsTrigger>
              <TabsTrigger value="favorites">
                <Star className="h-4 w-4 mr-2" />
                Favoritos
              </TabsTrigger>
              <TabsTrigger value="images">
                <ImageIcon className="h-4 w-4 mr-2" />
                Imagens
              </TabsTrigger>
              <TabsTrigger value="videos">
                <Video className="h-4 w-4 mr-2" />
                Vídeos
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Procurar ficheiros..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  A carregar...
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-muted-foreground">Nenhuma média encontrada</p>
                  <p className="text-sm text-muted-foreground">
                    Carregue ficheiros para construir a sua biblioteca
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedIds.has(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => toggleSelection(file.id)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <img
                          src={file.thumbnail_url || file.file_url}
                          alt={file.file_name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Badge className="bg-primary text-primary-foreground">
                              Selecionado
                            </Badge>
                          </div>
                        )}
                        {file.file_type === 'video' && file.duration && (
                          <Badge
                            variant="secondary"
                            className="absolute bottom-2 right-2 text-xs"
                          >
                            {Math.floor(file.duration / 60)}:{(file.duration % 60)
                              .toString()
                              .padStart(2, '0')}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size} de {maxSelection} selecionados
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddToPost} disabled={selectedIds.size === 0}>
              Adicionar à publicação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
