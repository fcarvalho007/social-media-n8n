import { SocialNetwork, NetworkValidation, MediaItem } from '@/types/social';
import { NETWORK_INFO, NETWORK_CONSTRAINTS } from '@/lib/socialNetworks';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NetworkPreviewProps {
  networks: SocialNetwork[];
  caption: string;
  firstComment?: string;
  mediaItems: MediaItem[];
  validations: Record<SocialNetwork, NetworkValidation>;
  postStatus?: string;
}

function InstagramPreview({ caption, mediaItems }: { caption: string; mediaItems: MediaItem[] }) {
  return (
    <div className="bg-background rounded-lg border-2 border-border p-4 space-y-3">
      {mediaItems.length > 0 && (
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          <img
            src={mediaItems[0]?.url}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]" />
          <span className="font-semibold text-sm">your_profile</span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{caption || 'Caption will appear here...'}</p>
      </div>
    </div>
  );
}

function LinkedInPreview({ caption, mediaItems }: { caption: string; mediaItems: MediaItem[] }) {
  return (
    <div className="bg-background rounded-lg border-2 border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-full bg-[#0077B5]" />
        <div>
          <p className="font-semibold text-sm">Your Name</p>
          <p className="text-xs text-muted-foreground">Your headline</p>
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap">{caption || 'Caption will appear here...'}</p>
      {mediaItems.length > 0 && (
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            src={mediaItems[0]?.url}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

function FacebookPreview({ caption, mediaItems }: { caption: string; mediaItems: MediaItem[] }) {
  return (
    <div className="bg-background rounded-lg border-2 border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-full bg-[#1877F2]" />
        <div>
          <p className="font-semibold text-sm">Your Page</p>
          <p className="text-xs text-muted-foreground">Just now</p>
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap">{caption || 'Caption will appear here...'}</p>
      {mediaItems.length > 0 && (
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            src={mediaItems[0]?.url}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

function XPreview({ caption, mediaItems }: { caption: string; mediaItems: MediaItem[] }) {
  return (
    <div className="bg-background rounded-lg border-2 border-border p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm">Your Name</span>
            <span className="text-muted-foreground text-sm">@handle</span>
          </div>
          <p className="text-sm whitespace-pre-wrap mt-1">{caption || 'Tweet will appear here...'}</p>
          {mediaItems.length > 0 && (
            <div className={`mt-3 grid gap-1 ${mediaItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} rounded-xl overflow-hidden`}>
              {mediaItems.slice(0, 4).map((item, i) => (
                <div key={i} className="aspect-square bg-muted">
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TikTokPreview({ caption, mediaItems }: { caption: string; mediaItems: MediaItem[] }) {
  return (
    <div className="bg-black rounded-lg aspect-[9/16] max-h-[500px] relative overflow-hidden">
      {mediaItems.length > 0 && (
        <img
          src={mediaItems[0]?.url}
          alt="Preview"
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-sm">{caption || 'Caption will appear here...'}</p>
      </div>
    </div>
  );
}

function YouTubePreview({ caption, mediaItems }: { caption: string; mediaItems: MediaItem[] }) {
  return (
    <div className="bg-black rounded-lg aspect-[9/16] max-h-[500px] relative overflow-hidden">
      {mediaItems.length > 0 && (
        <img
          src={mediaItems[0]?.url}
          alt="Preview"
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-sm font-semibold">{caption?.substring(0, 100) || 'Title will appear here...'}</p>
      </div>
    </div>
  );
}

export function NetworkPreview({
  networks,
  caption,
  firstComment,
  mediaItems,
  validations,
  postStatus = 'DRAFT',
}: NetworkPreviewProps) {
  if (networks.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full py-12">
          <div className="text-center space-y-2">
            <Info className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Selecione redes para ver pré-visualizações
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <Badge 
        variant={
          postStatus === 'DRAFT' ? 'secondary' : 
          postStatus === 'WAITING_FOR_APPROVAL' ? 'outline' :
          'default'
        }
        className="font-bold"
      >
        {postStatus}
      </Badge>

      {/* Network Tabs */}
      <Tabs defaultValue={networks[0]} className="w-full">
        <TabsList className="w-full flex-wrap h-auto">
          {networks.map(network => {
            const info = NETWORK_INFO[network];
            const validation = validations[network];
            const hasErrors = validation?.errors?.length > 0;
            
            return (
              <TabsTrigger
                key={network}
                value={network}
                className="flex items-center gap-2"
              >
                <info.icon className="h-4 w-4" />
                <span>{info.name}</span>
                {hasErrors && <AlertCircle className="h-3 w-3 text-destructive" />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {networks.map(network => {
          const validation = validations[network];
          const info = NETWORK_INFO[network];

          return (
            <TabsContent key={network} value={network} className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <info.icon className="h-5 w-5" style={{ color: info.color }} />
                    <span className="font-bold">{info.name}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preview */}
                  <ScrollArea className="max-h-[400px]">
                    {network === 'instagram' && <InstagramPreview caption={caption} mediaItems={mediaItems} />}
                    {network === 'linkedin' && <LinkedInPreview caption={caption} mediaItems={mediaItems} />}
                    {network === 'facebook' && <FacebookPreview caption={caption} mediaItems={mediaItems} />}
                    {network === 'x' && <XPreview caption={caption} mediaItems={mediaItems} />}
                    {network === 'tiktok' && <TikTokPreview caption={caption} mediaItems={mediaItems} />}
                    {network === 'youtube' && <YouTubePreview caption={caption} mediaItems={mediaItems} />}
                  </ScrollArea>

                  {/* Compliance & Warnings */}
                  {validation && (
                    <div className="space-y-2">
                      {validation.errors.length > 0 && (
                        <div className="space-y-1">
                          {validation.errors.map((error, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-lg">
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {validation.warnings.length > 0 && (
                        <div className="space-y-1">
                          {validation.warnings.map((warning, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-warning bg-warning/10 p-2 rounded-lg">
                              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {validation.valid && validation.warnings.length === 0 && (
                        <div className="flex items-center gap-2 text-sm text-success bg-success/10 p-2 rounded-lg">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Todas as validações passaram</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
