import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Instagram, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SocialPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: 'instagram' | 'linkedin';
  caption: string;
  hashtags?: string[];
  previewImage?: string;
}

export const SocialPreviewDialog = ({
  open,
  onOpenChange,
  platform,
  caption,
  hashtags = [],
  previewImage
}: SocialPreviewDialogProps) => {
  // Convert markdown formatting to styled text
  const renderFormattedText = (text: string) => {
    const parts: JSX.Element[] = [];
    let currentIndex = 0;
    let keyIndex = 0;

    // Replace **bold** and *italic*
    const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > currentIndex) {
        parts.push(
          <span key={`text-${keyIndex++}`}>
            {text.substring(currentIndex, match.index)}
          </span>
        );
      }

      // Add formatted text
      if (match[1]) {
        // Bold
        parts.push(
          <strong key={`bold-${keyIndex++}`} className="font-bold">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // Italic
        parts.push(
          <em key={`italic-${keyIndex++}`} className="italic">
            {match[4]}
          </em>
        );
      }

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(
        <span key={`text-${keyIndex++}`}>
          {text.substring(currentIndex)}
        </span>
      );
    }

    return parts;
  };

  const fullCaption = hashtags.length > 0 
    ? `${caption}\n\n${hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`
    : caption;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {platform === 'instagram' ? (
              <>
                <Instagram className="h-5 w-5 text-pink-500" />
                Pré-visualização Instagram
              </>
            ) : (
              <>
                <Linkedin className="h-5 w-5 text-blue-600" />
                Pré-visualização LinkedIn
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className={cn(
          'rounded-lg overflow-hidden',
          platform === 'instagram' ? 'bg-white' : 'bg-[#f3f2ef]'
        )}>
          {/* Mock Social Media Post */}
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'rounded-full bg-gradient-to-br flex items-center justify-center text-white font-semibold',
                platform === 'instagram' 
                  ? 'h-10 w-10 from-purple-600 to-pink-500' 
                  : 'h-12 w-12 from-blue-600 to-blue-700'
              )}>
                {platform === 'instagram' ? 'IG' : 'in'}
              </div>
              <div>
                <p className={cn(
                  'font-semibold',
                  platform === 'instagram' ? 'text-sm' : 'text-base'
                )}>
                  {platform === 'instagram' ? 'seu_perfil' : 'O Seu Perfil'}
                </p>
                {platform === 'linkedin' && (
                  <p className="text-xs text-gray-500">Sua descrição profissional</p>
                )}
              </div>
            </div>

            {/* Image Preview */}
            {previewImage && (
              <div className="mb-3 -mx-4">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="w-full aspect-square object-cover"
                />
              </div>
            )}

            {/* Caption */}
            <div className={cn(
              'whitespace-pre-wrap break-words',
              platform === 'instagram' ? 'text-sm' : 'text-base'
            )}>
              <p className="leading-relaxed">
                {renderFormattedText(fullCaption)}
              </p>
            </div>

            {/* Engagement Section */}
            <div className={cn(
              'flex items-center gap-4 pt-3 mt-3 border-t',
              platform === 'instagram' ? 'text-2xl' : 'text-gray-500'
            )}>
              {platform === 'instagram' ? (
                <>
                  <span>❤️</span>
                  <span>💬</span>
                  <span>📤</span>
                </>
              ) : (
                <div className="flex gap-3 text-sm">
                  <Badge variant="secondary">👍 Gosto</Badge>
                  <Badge variant="secondary">💬 Comentar</Badge>
                  <Badge variant="secondary">🔄 Partilhar</Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Esta é uma pré-visualização aproximada. A aparência final pode variar.
        </p>
      </DialogContent>
    </Dialog>
  );
};
