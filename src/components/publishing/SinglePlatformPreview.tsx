import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Instagram, Linkedin, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SinglePlatformPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: 'instagram' | 'linkedin';
  caption: string;
  hashtags: string[];
  mediaCount?: number;
  isDocument?: boolean;
}

const SinglePlatformPreview = ({
  open,
  onOpenChange,
  platform,
  caption,
  hashtags,
  mediaCount = 1,
  isDocument = false,
}: SinglePlatformPreviewProps) => {
  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .split('\n')
      .map((line, i) => `<p key=${i} class="mb-2">${line || '&nbsp;'}</p>`)
      .join('');
  };

  const platformConfig = {
    instagram: {
      icon: Instagram,
      name: 'Instagram',
      color: 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500',
      username: 'digitalsprint_pt',
      avatar: '/placeholder.svg',
    },
    linkedin: {
      icon: Linkedin,
      name: 'LinkedIn',
      color: 'bg-[#0077B5]',
      username: 'Digital Sprint',
      avatar: '/placeholder.svg',
    },
  };

  const config = platformConfig[platform];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,500px)] max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${config.color} text-white`}>
              <Icon className="h-5 w-5" />
            </div>
            <span>Pré-visualização {config.name}</span>
            {isDocument && platform === 'linkedin' && (
              <Badge variant="secondary" className="ml-auto">
                Documento (PDF)
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-80px)]">
          <div className="p-4">
            {/* Post Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">DS</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{config.username}</p>
                <p className="text-xs text-muted-foreground">Há 2 horas</p>
              </div>
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Media Placeholder */}
            <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg aspect-square mb-4 flex items-center justify-center">
              <div className="text-center">
                {platform === 'instagram' ? (
                  <>
                    <Instagram className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Carrossel · {mediaCount} {mediaCount === 1 ? 'imagem' : 'imagens'}
                    </p>
                  </>
                ) : (
                  <>
                    <Linkedin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    {isDocument ? (
                      <div>
                        <p className="text-sm font-semibold mb-1">Documento (PDF)</p>
                        <p className="text-xs text-muted-foreground">
                          {mediaCount} {mediaCount === 1 ? 'página' : 'páginas'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {mediaCount} {mediaCount === 1 ? 'imagem' : 'imagens'}
                      </p>
                    )}
                  </>
                )}
              </div>
              {mediaCount > 1 && (
                <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  1/{mediaCount}
                </div>
              )}
            </div>

            {/* Engagement (IG only) */}
            {platform === 'instagram' && (
              <div className="flex items-center gap-4 mb-3">
                <Heart className="h-6 w-6" />
                <MessageCircle className="h-6 w-6" />
                <Send className="h-6 w-6" />
                <Bookmark className="h-6 w-6 ml-auto" />
              </div>
            )}

            {/* Caption */}
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-semibold mr-2">{config.username}</span>
                <span
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatText(caption) }}
                />
              </div>

              {/* Hashtags */}
              {hashtags.length > 0 && (
                <div className="text-sm text-primary/80">
                  {hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ')}
                </div>
              )}

              {platform === 'instagram' && (
                <p className="text-xs text-muted-foreground">Ver todos os comentários</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SinglePlatformPreview;
