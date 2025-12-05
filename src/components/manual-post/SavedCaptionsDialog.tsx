import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSavedCaptions } from '@/hooks/useSavedCaptions';
import { Bookmark, Trash2, Plus, Search, Loader2 } from 'lucide-react';

interface SavedCaptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCaption: string;
  onSelectCaption: (caption: string) => void;
}

export default function SavedCaptionsDialog({
  open,
  onOpenChange,
  currentCaption,
  onSelectCaption,
}: SavedCaptionsDialogProps) {
  const { captions, isLoading, saveCaption, isSaving, deleteCaption, isDeleting } = useSavedCaptions();
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCaptions = captions.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    if (!newTitle.trim()) return;
    saveCaption({ title: newTitle, content: currentCaption });
    setNewTitle('');
    setShowSaveForm(false);
  };

  const handleSelect = (content: string) => {
    onSelectCaption(content);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Legendas Guardadas
          </DialogTitle>
          <DialogDescription>
            Guarde e reutilize legendas recorrentes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Save current caption */}
          {currentCaption.trim() && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              {showSaveForm ? (
                <div className="space-y-3">
                  <Label htmlFor="caption-title">Nome da legenda</Label>
                  <Input
                    id="caption-title"
                    placeholder="Ex: CTA para promoções"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={isSaving || !newTitle.trim()}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowSaveForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowSaveForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Guardar legenda atual
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar legendas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* List */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCaptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bookmark className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Nenhuma legenda guardada</p>
                <p className="text-sm">Guarde legendas recorrentes para reutilizar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCaptions.map((caption) => (
                  <div
                    key={caption.id}
                    className="group p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{caption.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {caption.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSelect(caption.content)}
                        >
                          Usar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteCaption(caption.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
