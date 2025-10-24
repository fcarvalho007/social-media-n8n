import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MediaItem } from '@/types/social';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileImage, FileVideo, X } from 'lucide-react';
import { toast } from 'sonner';

interface UploadMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (items: MediaItem[]) => void;
}

export function UploadMediaDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: UploadMediaDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
        const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB

      if (!isImage && !isVideo) {
        toast.error(`${file.name}: Apenas imagens e vídeos são suportados`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name}: Tamanho do ficheiro excede 100MB`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 10));
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const uploadedItems: MediaItem[] = [];
      const totalFiles = selectedFiles.length;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // For demo purposes, we'll create a local object URL
        // In production, you would upload to Supabase Storage
        const url = URL.createObjectURL(file);
        
        // Get file dimensions for images
        let width: number | undefined;
        let height: number | undefined;
        let duration: number | undefined;

        if (file.type.startsWith('image/')) {
          const img = await new Promise<HTMLImageElement>((resolve) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.src = url;
          });
          width = img.width;
          height = img.height;
        }

        // For demo: save to media library (in production, this would be Supabase Storage)
        const { data: mediaData, error: mediaError } = await supabase
          .from('media_library')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_type: file.type.startsWith('image/') ? 'image' : 'video',
            file_url: url,
            thumbnail_url: url,
            file_size: file.size,
            width,
            height,
            duration,
            aspect_ratio: width && height ? `${width}:${height}` : undefined,
          })
          .select()
          .single();

        if (mediaError) throw mediaError;

        uploadedItems.push({
          id: mediaData.id,
          url: url,
          thumbnail_url: url,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          width,
          height,
          duration,
          order: i,
        });

        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      toast.success(`${uploadedItems.length} ficheiro(s) carregado(s) com sucesso`);
      onUploadComplete(uploadedItems);
      onOpenChange(false);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Falha ao carregar ficheiros');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Carregar Média</DialogTitle>
          <DialogDescription>
            Selecione até 10 imagens ou vídeos para carregar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            <div className="text-center space-y-2">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-semibold">Clique para carregar</p>
                <p className="text-sm text-muted-foreground">
                  Imagens ou vídeos (máx. 100MB cada)
                </p>
              </div>
            </div>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading || selectedFiles.length >= 10}
            />
          </label>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                {selectedFiles.length} ficheiro(s) selecionado(s)
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                  >
                    {file.type.startsWith('image/') ? (
                      <FileImage className="h-5 w-5 text-primary" />
                    ) : (
                      <FileVideo className="h-5 w-5 text-accent" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                A carregar {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
          >
            Carregar {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
