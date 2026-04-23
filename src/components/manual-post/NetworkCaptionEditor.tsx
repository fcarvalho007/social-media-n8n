import { useState, useRef, useEffect } from 'react';
import { SocialNetwork } from '@/types/social';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Instagram, Linkedin, Youtube, Facebook, Smile, Bookmark, Sparkles, Split, Merge } from 'lucide-react';
import { NETWORK_CONSTRAINTS } from '@/lib/socialNetworks';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import emojiDataPt from 'emoji-picker-react/dist/data/emojis-pt';

// Network labels and icons
const NETWORK_CONFIG: Record<SocialNetwork, { label: string; icon: React.ElementType; color: string }> = {
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-600' },
  youtube: { label: 'YouTube', icon: Youtube, color: 'text-red-500' },
  tiktok: { label: 'TikTok', icon: () => <span className="text-xs font-bold">TT</span>, color: 'text-foreground' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-blue-500' },
  googlebusiness: { label: 'Google', icon: () => <span className="text-xs font-bold">G</span>, color: 'text-foreground' },
  x: { label: 'X', icon: () => <span className="text-xs font-bold">X</span>, color: 'text-foreground' },
};

interface NetworkCaptionEditorProps {
  caption: string;
  onCaptionChange: (caption: string) => void;
  networkCaptions: Record<string, string>;
  onNetworkCaptionChange: (network: SocialNetwork, caption: string) => void;
  selectedNetworks: SocialNetwork[];
  useSeparateCaptions: boolean;
  onToggleSeparate: (value: boolean) => void;
  disabled?: boolean;
  onOpenSavedCaptions?: () => void;
  onOpenAIDialog?: () => void;
}

export function NetworkCaptionEditor({
  caption,
  onCaptionChange,
  networkCaptions,
  onNetworkCaptionChange,
  selectedNetworks,
  useSeparateCaptions,
  onToggleSeparate,
  disabled,
  onOpenSavedCaptions,
  onOpenAIDialog,
}: NetworkCaptionEditorProps) {
  const [activeNetwork, setActiveNetwork] = useState<SocialNetwork>(selectedNetworks[0] || 'instagram');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const networkTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Update active network when selection changes
  useEffect(() => {
    if (selectedNetworks.length > 0 && !selectedNetworks.includes(activeNetwork)) {
      setActiveNetwork(selectedNetworks[0]);
    }
  }, [selectedNetworks, activeNetwork]);

  const getMaxLength = (network: SocialNetwork): number => {
    return NETWORK_CONSTRAINTS[network]?.max_caption_length || 2200;
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (useSeparateCaptions) {
      const currentCaption = networkCaptions[activeNetwork] || '';
      const textarea = networkTextareaRefs.current[activeNetwork];
      const start = textarea?.selectionStart || currentCaption.length;
      const newCaption = currentCaption.slice(0, start) + emojiData.emoji + currentCaption.slice(start);
      onNetworkCaptionChange(activeNetwork, newCaption);
    } else {
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart || caption.length;
      const newCaption = caption.slice(0, start) + emojiData.emoji + caption.slice(start);
      onCaptionChange(newCaption);
    }
    setEmojiPickerOpen(false);
  };

  const getCurrentCaptionLength = (network?: SocialNetwork): number => {
    if (useSeparateCaptions && network) {
      return (networkCaptions[network] || '').length;
    }
    return caption.length;
  };

  // Only show toggle if 2+ networks selected
  const showToggle = selectedNetworks.length >= 2;

  return (
    <div className="space-y-3">
      {/* Toggle for separate captions */}
      {showToggle && (
        <div className="flex items-center justify-between p-2.5 xs:p-3 sm:p-4 rounded-lg xs:rounded-xl bg-muted/50 border min-h-[44px] xs:min-h-[48px] sm:min-h-[52px]">
          <div className="flex items-center gap-2 xs:gap-3">
            {useSeparateCaptions ? (
              <Split className="h-4 w-4 xs:h-5 xs:w-5 text-primary" />
            ) : (
              <Merge className="h-4 w-4 xs:h-5 xs:w-5 text-muted-foreground" />
            )}
            <Label htmlFor="separate-captions" className="text-xs xs:text-sm font-medium cursor-pointer leading-tight">
              {useSeparateCaptions ? 'Separadas' : 'Unificada'}
            </Label>
          </div>
          <Switch
            id="separate-captions"
            checked={useSeparateCaptions}
            onCheckedChange={onToggleSeparate}
            disabled={disabled}
          />
        </div>
      )}

      {/* Toolbar - Touch optimized with larger targets */}
      <div className="flex items-center gap-1 border rounded-lg xs:rounded-xl p-1 xs:p-1.5 sm:p-2 bg-muted/30 overflow-x-auto scrollbar-hide">
        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 xs:h-10 xs:w-10 sm:h-8 sm:w-8 flex-shrink-0" 
              title="Inserir emoji" 
              disabled={disabled}
            >
              <Smile className="h-4 w-4 xs:h-5 xs:w-5 sm:h-4 sm:w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-0" align="start" side="top">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              emojiData={emojiDataPt}
              width={320}
              height={350}
              searchPlaceHolder="Pesquisar emoji..."
              previewConfig={{ showPreview: false }}
              lazyLoadEmojis
            />
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-5 xs:h-6 mx-0.5" />

        {onOpenSavedCaptions && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 xs:h-10 sm:h-8 gap-1 px-2 xs:px-3 flex-shrink-0"
            onClick={onOpenSavedCaptions}
            title="Legendas guardadas"
            disabled={disabled}
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden xs:inline text-xs">Guardadas</span>
          </Button>
        )}

        <Separator orientation="vertical" className="h-5 xs:h-6 mx-0.5" />

        {onOpenAIDialog && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 xs:h-10 sm:h-8 gap-1 px-2 xs:px-3 flex-shrink-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20"
            onClick={onOpenAIDialog}
            title="Melhorar com IA"
            disabled={disabled}
          >
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium">IA</span>
          </Button>
        )}
      </div>

      {/* Unified Caption or Network Tabs */}
      {useSeparateCaptions && selectedNetworks.length >= 2 ? (
        <Tabs value={activeNetwork} onValueChange={(v) => setActiveNetwork(v as SocialNetwork)}>
          <TabsList className="w-full justify-start bg-muted/50 p-1.5 h-auto flex-wrap gap-1.5">
            {selectedNetworks.map((network) => {
              const config = NETWORK_CONFIG[network];
              const Icon = config.icon;
              const currentLength = getCurrentCaptionLength(network);
              const maxLength = getMaxLength(network);
              const isOverLimit = currentLength > maxLength;
              const isNearLimit = currentLength > maxLength * 0.9 && !isOverLimit;

              return (
                <TabsTrigger
                  key={network}
                  value={network}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] data-[state=active]:bg-background rounded-lg",
                    isOverLimit && "text-destructive"
                  )}
                >
                  <Icon className={cn("h-4 w-4", config.color)} />
                  <span className="hidden sm:inline">{config.label}</span>
                  <Badge
                    variant={isOverLimit ? 'destructive' : 'secondary'}
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 ml-1",
                      isNearLimit && "bg-orange-500/20 text-orange-600"
                    )}
                  >
                    {currentLength}/{maxLength}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {selectedNetworks.map((network) => {
            const maxLength = getMaxLength(network);
            return (
              <TabsContent key={network} value={network} className="mt-3" forceMount
                style={{ display: activeNetwork === network ? 'block' : 'none' }}
              >
                <Textarea
                  ref={(el) => { networkTextareaRefs.current[network] = el; }}
                  value={networkCaptions[network] || ''}
                  onChange={(e) => {
                    onNetworkCaptionChange(network, e.target.value);
                    // Auto-resize
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.max(150, e.target.scrollHeight)}px`;
                  }}
                  placeholder={`Legenda para ${NETWORK_CONFIG[network].label}...`}
                  disabled={disabled}
                  className="min-h-[150px] resize-none overflow-hidden"
                />
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={caption}
            onChange={(e) => {
              onCaptionChange(e.target.value);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.max(150, e.target.scrollHeight)}px`;
            }}
            placeholder="Escreva a sua legenda..."
            disabled={disabled}
            className="min-h-[150px] resize-none overflow-hidden"
          />
          {/* Character counters per network */}
          {selectedNetworks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedNetworks.map((network) => {
                const config = NETWORK_CONFIG[network];
                const Icon = config.icon;
                const maxLength = getMaxLength(network);
                const isOverLimit = caption.length > maxLength;
                const isNearLimit = caption.length > maxLength * 0.9 && !isOverLimit;

                return (
                  <Badge
                    key={network}
                    variant={isOverLimit ? 'destructive' : 'secondary'}
                    className={cn(
                      "text-xs",
                      isNearLimit && "bg-orange-500/20 text-orange-600"
                    )}
                  >
                    <Icon className={cn("h-3 w-3 mr-1", config.color)} />
                    {caption.length}/{maxLength}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
