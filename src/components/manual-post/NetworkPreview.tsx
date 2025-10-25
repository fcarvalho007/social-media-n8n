import { SocialNetwork, MediaItem } from '@/types/social';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Instagram, Linkedin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkPreviewProps {
  networks: SocialNetwork[];
  caption: string;
  firstComment: string;
  mediaItems: MediaItem[];
  validations: Record<SocialNetwork, {
    network: SocialNetwork;
    valid: boolean;
    warnings: string[];
    errors: string[];
  }>;
  postStatus: string;
}

export function NetworkPreview({
  networks,
  caption,
  firstComment,
  mediaItems,
  validations,
  postStatus
}: NetworkPreviewProps) {
  if (networks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>Selecione perfis para ver a pré-visualização</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getNetworkIcon = (network: SocialNetwork) => {
    if (network === 'instagram') return Instagram;
    if (network === 'linkedin') return Linkedin;
    return Instagram;
  };

  const getValidationBadge = (network: SocialNetwork) => {
    const validation = validations[network];
    if (!validation) return null;

    if (validation.errors.length > 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          {validation.errors.length} {validation.errors.length === 1 ? 'erro' : 'erros'}
        </Badge>
      );
    }

    if (validation.warnings.length > 0) {
      return (
        <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600">
          <AlertCircle className="h-3 w-3" />
          {validation.warnings.length} {validation.warnings.length === 1 ? 'aviso' : 'avisos'}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/20">
        <CheckCircle2 className="h-3 w-3" />
        Válido
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pré-visualização</CardTitle>
        <CardDescription>
          {networks.length} {networks.length === 1 ? 'rede' : 'redes'} • {mediaItems.length} {mediaItems.length === 1 ? 'item' : 'itens'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {networks.map((network) => {
          const Icon = getNetworkIcon(network);
          const validation = validations[network];

          return (
            <div key={network} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn(
                    "h-5 w-5",
                    network === 'instagram' && "text-pink-600",
                    network === 'linkedin' && "text-blue-600"
                  )} />
                  <span className="font-semibold capitalize">{network}</span>
                </div>
                {getValidationBadge(network)}
              </div>

              {/* Preview Area */}
              {mediaItems.length > 0 && (
                <div className={cn(
                  "rounded-lg overflow-hidden border-2",
                  network === 'instagram' && "border-pink-600/30 aspect-[9/16] max-w-[200px]",
                  network === 'linkedin' && "border-blue-600/30 aspect-[1.91/1] max-w-full"
                )}>
                  <img 
                    src={mediaItems[0].url} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Caption Preview */}
              {caption && (
                <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
                  <p className="font-medium">Caption:</p>
                  <p className="text-muted-foreground line-clamp-3">{caption}</p>
                </div>
              )}

              {/* Validation Messages */}
              {validation && (
                <div className="space-y-2">
                  {validation.errors.map((error, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                  {validation.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-yellow-600">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Post Status Badge */}
        <div className="pt-3 border-t">
          <Badge variant="outline" className="w-full justify-center">
            Status: {postStatus}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
