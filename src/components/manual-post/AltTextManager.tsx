import { MediaItem } from '@/types/social';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AltTextManagerProps {
  mediaItems: MediaItem[];
  altTexts: Record<string, string>;
  onAltTextChange: (mediaId: string, altText: string) => void;
}

export function AltTextManager({ mediaItems, altTexts, onAltTextChange }: AltTextManagerProps) {
  const images = mediaItems.filter(item => item.type === 'image');
  
  if (images.length === 0) {
    return null;
  }

  const missingCount = images.filter(img => !altTexts[img.id]?.trim()).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Texto alternativo</CardTitle>
            <CardDescription>
              Adicione texto descritivo para cada imagem
            </CardDescription>
          </div>
          {missingCount > 0 ? (
            <Badge variant="outline" className="text-warning">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {missingCount} em falta
            </Badge>
          ) : (
            <Badge variant="outline" className="text-success">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {images.map((image, index) => (
            <div key={image.id} className="flex gap-3 items-start">
              <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-border flex-shrink-0">
                <img
                  src={image.thumbnail_url || image.url}
                  alt={altTexts[image.id] || `Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Imagem {index + 1}
                </label>
                <Input
                  value={altTexts[image.id] || ''}
                  onChange={(e) => onAltTextChange(image.id, e.target.value)}
                  placeholder="Descreva esta imagem..."
                  className="h-9 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
