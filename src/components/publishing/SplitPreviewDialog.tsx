import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Instagram, Linkedin, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SplitPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instagramCaption: string;
  linkedinBody: string;
  hashtags: string[];
  mediaCount?: number;
}

const SplitPreviewDialog = ({
  open,
  onOpenChange,
  instagramCaption,
  linkedinBody,
  hashtags,
  mediaCount = 1,
}: SplitPreviewDialogProps) => {
  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .split('\n')
      .map((line, i) => `<p key=${i} class="mb-2">${line || '&nbsp;'}</p>`)
      .join('');
  };

  const PreviewCard = ({
    platform,
    caption,
    isDocument = false,
  }: {
    platform: 'instagram' | 'linkedin';
    caption: string;
    isDocument?: boolean;
  }) => {
    const config = {
      instagram: {
        icon: Instagram,
        name: 'Instagram',
        color: 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500',
        username: 'digitalsprint_pt',
      },
      linkedin: {
        icon: Linkedin,
        name: 'LinkedIn',
        color: 'bg-[#0077B5]',
        username: 'Digital Sprint',
      },
    }[platform];

    const Icon = config.icon;

    return (
      <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b">
          <div className={`p-1.5 rounded ${config.color} text-white`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">{config.name}</span>
          {isDocument && platform === 'linkedin' && (
            <Badge variant="secondary" className="ml-auto text-xs">
              PDF
            </Badge>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[calc(80vh-120px)]">
          <div className="p-3">
            {/* Post Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                <span className="text-white font-semibold text-xs">DS</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-xs">{config.username}</p>
                <p className="text-[10px] text-muted-foreground">Há 2 horas</p>
              </div>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Media Placeholder */}
            <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded aspect-square mb-3 flex items-center justify-center">
              <div className="text-center">
                <Icon className="h-8 w-8 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {platform === 'linkedin' && isDocument ? (
                    <>Documento · {mediaCount} pág.</>
                  ) : (
                    <>{mediaCount} img.</>
                  )}
                </p>
              </div>
              {mediaCount > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  1/{mediaCount}
                </div>
              )}
            </div>

            {/* Engagement (IG only) */}
            {platform === 'instagram' && (
              <div className="flex items-center gap-3 mb-2">
                <Heart className="h-5 w-5" />
                <MessageCircle className="h-5 w-5" />
                <Send className="h-5 w-5" />
                <Bookmark className="h-5 w-5 ml-auto" />
              </div>
            )}

            {/* Caption */}
            <div className="space-y-1.5">
              <div className="text-xs">
                <span className="font-semibold mr-1">{config.username}</span>
                <span
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatText(caption) }}
                />
              </div>

              {/* Hashtags */}
              {hashtags.length > 0 && (
                <div className="text-xs text-primary/80">
                  {hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ')}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(95vw,1000px)] max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <span>Pré-visualização das Plataformas</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PreviewCard platform="instagram" caption={instagramCaption} />
            <PreviewCard platform="linkedin" caption={linkedinBody} isDocument={true} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SplitPreviewDialog;
