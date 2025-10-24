import { useState, useEffect, useRef } from 'react';
import { SocialNetwork } from '@/types/social';
import { NETWORK_CONSTRAINTS, NETWORK_INFO, getCharacterCount } from '@/lib/socialNetworks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertCircle, Smile, Bold, Italic } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface CaptionInputProps {
  caption: string;
  onCaptionChange: (caption: string) => void;
  selectedNetworks: SocialNetwork[];
}

export function CaptionInput({ caption, onCaptionChange, selectedNetworks }: CaptionInputProps) {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const newWarnings: string[] = [];
    const hashtagCount = (caption.match(/#/g) || []).length;
    
    if (hashtagCount > 30) {
      newWarnings.push('Hashtags excessivas podem reduzir o engagement');
    }

    // Check for duplicate lines
    const lines = caption.split('\n').filter(l => l.trim());
    const uniqueLines = new Set(lines);
    if (lines.length !== uniqueLines.size) {
      newWarnings.push('Texto duplicado detetado');
    }

    setWarnings(newWarnings);
  }, [caption]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newCaption = caption.substring(0, start) + emojiData.emoji + caption.substring(end);
    
    onCaptionChange(newCaption);
    setIsEmojiPickerOpen(false);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emojiData.emoji.length, start + emojiData.emoji.length);
    }, 0);
  };

  const insertFormatting = (format: 'bold' | 'italic') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = caption.substring(start, end);
    
    let formattedText = '';
    if (format === 'bold') {
      formattedText = `*${selectedText}*`;
    } else if (format === 'italic') {
      formattedText = `_${selectedText}_`;
    }

    const newCaption = caption.substring(0, start) + formattedText + caption.substring(end);
    onCaptionChange(newCaption);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newPos = start + formattedText.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const getNetworkStatus = (network: SocialNetwork) => {
    const constraints = NETWORK_CONSTRAINTS[network];
    const count = getCharacterCount(caption, network);
    const max = constraints.max_caption_length;
    const percentage = (count / max) * 100;

    return {
      count,
      max,
      percentage,
      isOverLimit: count > max,
      isNearLimit: percentage > 90 && count <= max,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Legenda</CardTitle>
        <CardDescription>Escreva a legenda da sua publicação</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertFormatting('bold')}
              title="Negrito (*texto*)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertFormatting('italic')}
              title="Itálico (_texto_)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  title="Adicionar emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 border-0" align="start">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  searchPlaceHolder="Procurar emoji..."
                  previewConfig={{ showPreview: false }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Textarea
            ref={textareaRef}
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Escreva a sua legenda aqui..."
            className="min-h-[120px] resize-none"
          />
        </div>

        {/* Character counters by network */}
        {selectedNetworks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedNetworks.map(network => {
              const status = getNetworkStatus(network);
              const networkInfo = NETWORK_INFO[network];

              return (
                <Badge
                  key={network}
                  variant={status.isOverLimit ? 'destructive' : 'secondary'}
                  className={cn(
                    'text-xs font-semibold',
                    status.isNearLimit && !status.isOverLimit && 'bg-warning text-warning-foreground'
                  )}
                >
                  <networkInfo.icon className="h-3 w-3 mr-1" />
                  {status.count}/{status.max}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-warning">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
