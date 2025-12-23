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
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2">
            {useSeparateCaptions ? (
              <Split className="h-4 w-4 text-primary" />
            ) : (
              <Merge className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="separate-captions" className="text-sm font-medium cursor-pointer">
              {useSeparateCaptions ? 'Legendas separadas por rede' : 'Legenda unificada'}
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

      {/* Toolbar */}
      <div className="flex items-center gap-1 border rounded-lg p-1.5 bg-muted/30">
        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Inserir emoji" disabled={disabled}>
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-0" align="start">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={320}
              height={400}
              searchPlaceholder="Pesquisar emoji..."
              previewConfig={{ showPreview: false }}
            />
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {onOpenSavedCaptions && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onOpenSavedCaptions}
            title="Legendas guardadas"
            disabled={disabled}
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Guardadas</span>
          </Button>
        )}

        <Separator orientation="vertical" className="h-5 mx-1" />

        {onOpenAIDialog && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20"
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
          <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap gap-1">
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
                    "flex items-center gap-1.5 px-3 py-1.5 data-[state=active]:bg-background",
                    isOverLimit && "text-destructive"
                  )}
                >
                  <Icon className={cn("h-4 w-4", config.color)} />
                  <span className="hidden sm:inline">{config.label}</span>
                  <Badge
                    variant={isOverLimit ? 'destructive' : 'secondary'}
                    className={cn(
                      "text-[10px] px-1.5 py-0 ml-1",
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
              <TabsContent key={network} value={network} className="mt-3">
                <Textarea
                  ref={(el) => { networkTextareaRefs.current[network] = el; }}
                  value={networkCaptions[network] || ''}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, maxLength);
                    onNetworkCaptionChange(network, value);
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
              const maxLen = selectedNetworks.length > 0 
                ? Math.min(...selectedNetworks.map(n => getMaxLength(n)))
                : 2200;
              onCaptionChange(e.target.value.slice(0, maxLen));
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
