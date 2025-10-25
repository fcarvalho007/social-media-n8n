import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Instagram, Linkedin, AlertCircle, Info } from 'lucide-react';
import { PublishTarget, PostType } from '@/types/publishing';
import { cn } from '@/lib/utils';

interface PublishingPreviewProps {
  selectedTargets: Record<PublishTarget, boolean>;
  postType: PostType;
  mediaCount: number;
  caption?: string;
  images?: string[];
}

export function PublishingPreview({ 
  selectedTargets, 
  postType, 
  mediaCount,
  caption,
  images = []
}: PublishingPreviewProps) {
  const activeTargets = Object.entries(selectedTargets)
    .filter(([_, active]) => active)
    .map(([target]) => target as PublishTarget);

  if (activeTargets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>Selecione plataformas para ver a pré-visualização</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getAspectWarning = (platform: PublishTarget) => {
    if (postType !== 'carousel' && postType !== 'single_image') return null;
    
    if (platform === 'instagram') {
      return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-900 dark:text-blue-100">
            <p className="font-medium">Proporções recomendadas:</p>
            <p className="text-blue-700 dark:text-blue-300">9:16 (Stories) ou 4:5 (Feed)</p>
          </div>
        </div>
      );
    }
    
    if (platform === 'linkedin') {
      return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-900 dark:text-blue-100">
            <p className="font-medium">Proporções recomendadas:</p>
            <p className="text-blue-700 dark:text-blue-300">1.91:1 (Landscape) ou 1:1 (Quadrado)</p>
          </div>
        </div>
      );
    }
    
    return null;
  };

  const getMediaInfo = (platform: PublishTarget) => {
    if (postType === 'carousel') {
      if (platform === 'instagram') {
        const isValid = mediaCount >= 2 && mediaCount <= 10;
        return (
          <div className={cn(
            "flex items-start gap-2 p-3 rounded-lg border",
            isValid 
              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
          )}>
            {isValid ? (
              <Info className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div className={cn(
              "text-xs",
              isValid 
                ? "text-green-900 dark:text-green-100"
                : "text-red-900 dark:text-red-100"
            )}>
              <p className="font-medium">
                {isValid ? '✓ Carrossel válido' : '✗ Carrossel inválido'}
              </p>
              <p className={isValid ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                {mediaCount} {mediaCount === 1 ? 'imagem' : 'imagens'} • IG permite 2-10 imagens
              </p>
            </div>
          </div>
        );
      }
      
      if (platform === 'linkedin') {
        const isValid = mediaCount >= 2 && mediaCount <= 9;
        return (
          <div className={cn(
            "flex items-start gap-2 p-3 rounded-lg border",
            isValid 
              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
          )}>
            {isValid ? (
              <Info className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div className={cn(
              "text-xs",
              isValid 
                ? "text-green-900 dark:text-green-100"
                : "text-red-900 dark:text-red-100"
            )}>
              <p className="font-medium">
                {isValid ? '✓ Documento PDF válido' : '✗ Documento PDF inválido'}
              </p>
              <p className={isValid ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                {mediaCount} {mediaCount === 1 ? 'página' : 'páginas'} • LinkedIn aceita 2-9 páginas
              </p>
            </div>
          </div>
        );
      }
    }
    
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pré-visualização por Plataforma</CardTitle>
        <CardDescription>
          {mediaCount} {mediaCount === 1 ? 'item' : 'itens'} • {postType.replace('_', ' ')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTargets[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${activeTargets.length}, 1fr)` }}>
            {selectedTargets.instagram && (
              <TabsTrigger value="instagram" className="gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </TabsTrigger>
            )}
            {selectedTargets.linkedin && (
              <TabsTrigger value="linkedin" className="gap-2">
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </TabsTrigger>
            )}
          </TabsList>

          {selectedTargets.instagram && (
            <TabsContent value="instagram" className="space-y-3 mt-4">
              <div className="aspect-[9/16] max-w-[280px] mx-auto rounded-lg border-2 border-pink-600/30 bg-gradient-to-b from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 overflow-hidden shadow-lg">
                {images[0] ? (
                  <img src={images[0]} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Instagram className="h-12 w-12 text-pink-600/30" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {getMediaInfo('instagram')}
                {getAspectWarning('instagram')}
                {caption && (
                  <div className="p-3 rounded-lg bg-muted/50 border text-xs">
                    <p className="font-medium mb-1">Caption Preview:</p>
                    <p className="text-muted-foreground line-clamp-3">{caption}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {selectedTargets.linkedin && (
            <TabsContent value="linkedin" className="space-y-3 mt-4">
              <div className="aspect-[1.91/1] max-w-full rounded-lg border-2 border-blue-600/30 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20 overflow-hidden shadow-lg">
                {images[0] ? (
                  <img src={images[0]} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Linkedin className="h-12 w-12 text-blue-600/30" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {getMediaInfo('linkedin')}
                {getAspectWarning('linkedin')}
                {caption && (
                  <div className="p-3 rounded-lg bg-muted/50 border text-xs">
                    <p className="font-medium mb-1">Post Preview:</p>
                    <p className="text-muted-foreground line-clamp-3">{caption}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
