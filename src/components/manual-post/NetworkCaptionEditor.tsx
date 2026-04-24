import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
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
import {
  Copy, Instagram, Linkedin, Youtube, Facebook, Smile, Bookmark, Sparkles, Split, Merge,
  Wand2, Loader2, Target, Heart, GraduationCap, Scissors, BookOpen,
} from 'lucide-react';
import { NETWORK_CONSTRAINTS } from '@/lib/socialNetworks';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import emojiDataPt from 'emoji-picker-react/dist/data/emojis-pt';
import { toast } from 'sonner';
import { ToneAction } from '@/components/manual-post/ai/CaptionToneToolbar';

const TONE_OPTIONS: Array<{ id: ToneAction; label: string; description: string; icon: React.ElementType }> = [
  { id: 'direct', label: 'Mais direto', description: 'Frases curtas, sem rodeios', icon: Target },
  { id: 'emotional', label: 'Mais emocional', description: 'Tom caloroso e pessoal', icon: Heart },
  { id: 'technical', label: 'Mais técnico', description: 'Terminologia precisa', icon: GraduationCap },
  { id: 'shorter', label: 'Mais curto', description: 'Reduzir comprimento', icon: Scissors },
  { id: 'longer', label: 'Mais longo', description: 'Expandir com contexto', icon: BookOpen },
  { id: 'linkedin', label: 'Tom LinkedIn', description: 'Profissional, business', icon: Linkedin },
  { id: 'instagram', label: 'Tom Instagram', description: 'Conversacional, quente', icon: Instagram },
];

const MIN_TEXTAREA_HEIGHT = 220;
const MAX_TEXTAREA_HEIGHT = 420;

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  const nextHeight = Math.min(MAX_TEXTAREA_HEIGHT, Math.max(MIN_TEXTAREA_HEIGHT, textarea.scrollHeight));
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
}

// Network labels and icons
const NETWORK_CONFIG: Record<SocialNetwork, { label: string; icon: React.ElementType; color: string }> = {
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-[hsl(var(--color-instagram))]' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-[hsl(var(--color-linkedin))]' },
  youtube: { label: 'YouTube', icon: Youtube, color: 'text-[hsl(var(--color-youtube))]' },
  tiktok: { label: 'TikTok', icon: () => <span className="text-xs font-bold">TT</span>, color: 'text-foreground' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-[hsl(var(--color-facebook))]' },
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
  toneRewriteLoading?: ToneAction | null;
  onRewriteTone?: (tone: ToneAction) => void;
  /** Reservado para futura versão minimalista no estado active. Não usado actualmente. */
  minimalCounters?: unknown;
}

export interface NetworkCaptionEditorHandle {
  focusCaption: (network?: SocialNetwork) => void;
  getActiveNetwork: () => SocialNetwork;
}

export const NetworkCaptionEditor = forwardRef<NetworkCaptionEditorHandle, NetworkCaptionEditorProps>(function NetworkCaptionEditor({
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
  toneRewriteLoading = null,
  onRewriteTone,
}, ref) {
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

  useImperativeHandle(ref, () => ({
    focusCaption: (network?: SocialNetwork) => {
      if (useSeparateCaptions && network) {
        setActiveNetwork(network);
        requestAnimationFrame(() => networkTextareaRefs.current[network]?.focus());
        return;
      }
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    getActiveNetwork: () => activeNetwork,
  }), [activeNetwork, useSeparateCaptions]);

  useEffect(() => {
    if (!useSeparateCaptions) return;
    selectedNetworks.forEach((network) => {
      if (!Object.prototype.hasOwnProperty.call(networkCaptions, network)) {
        onNetworkCaptionChange(network, caption);
      }
    });
  }, [caption, networkCaptions, onNetworkCaptionChange, selectedNetworks, useSeparateCaptions]);

  const handleToggleSeparate = (next: boolean) => {
    if (next) {
      selectedNetworks.forEach((network) => {
        if (!Object.prototype.hasOwnProperty.call(networkCaptions, network)) {
          onNetworkCaptionChange(network, caption);
        }
      });
    }
    onToggleSeparate(next);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Legenda copiada');
    } catch {
      toast.error('Não foi possível copiar a legenda');
    }
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

  const activeCaption = useSeparateCaptions ? (networkCaptions[activeNetwork] || '') : caption;
  const showToneToolbar = activeCaption.trim().length > 20 && !!onRewriteTone;

  useEffect(() => {
    requestAnimationFrame(() => {
      if (useSeparateCaptions) {
        resizeTextarea(networkTextareaRefs.current[activeNetwork]);
        return;
      }
      resizeTextarea(textareaRef.current);
    });
  }, [activeNetwork, caption, networkCaptions, useSeparateCaptions]);

  // Only show toggle if 2+ networks selected
  const showToggle = selectedNetworks.length >= 2;

  return (
    <div className="manual-group-stack">
      {/* Toggle for separate captions */}
      {showToggle && (
        <div className="manual-subcard flex min-h-12 items-center justify-between">
          <div className="flex items-center gap-2 xs:gap-3">
            {useSeparateCaptions ? (
              <Split className="h-5 w-5 text-primary" strokeWidth={1.5} />
            ) : (
              <Merge className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            )}
            <Label htmlFor="separate-captions" className="manual-field-label cursor-pointer">
              {useSeparateCaptions ? 'Separadas' : 'Unificada'}
            </Label>
          </div>
          <Switch
            id="separate-captions"
            checked={useSeparateCaptions}
            onCheckedChange={handleToggleSeparate}
            disabled={disabled}
          />
        </div>
      )}

      {/* Toolbar - Touch optimized with larger targets */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/20 p-2 scrollbar-hide">
        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="manual-touch-target h-11 w-11 flex-shrink-0 sm:h-9 sm:w-9" 
              title="Inserir emoji" 
              disabled={disabled}
            >
              <Smile className="h-4 w-4" strokeWidth={1.5} />
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
            className="manual-touch-target h-11 flex-shrink-0 gap-1 px-3 sm:h-9"
            onClick={onOpenSavedCaptions}
            title="Legendas guardadas"
            disabled={disabled}
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden text-xs xs:inline">Guardadas</span>
          </Button>
        )}

        <Separator orientation="vertical" className="h-5 xs:h-6 mx-0.5" />

        {onOpenAIDialog && (
          <Button
            variant="ghost"
            size="sm"
            className="manual-touch-target h-11 flex-shrink-0 gap-1 border border-primary/20 bg-primary/10 px-3 hover:bg-primary/15 sm:h-9"
            onClick={onOpenAIDialog}
            title="Melhorar com IA"
            disabled={disabled}
          >
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span className="text-xs font-medium">IA</span>
          </Button>
        )}
      </div>

      {showToneToolbar && (
        <div className="flex justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || !!toneRewriteLoading}
                className="h-9 gap-1.5 border border-primary/20 bg-primary/5 px-3 text-xs hover:bg-primary/10"
                title="Ajustar tom da legenda"
              >
                {toneRewriteLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Wand2 className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                )}
                Ajustar tom
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" side="top" className="w-72 p-2">
              <div className="space-y-1">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ajustar tom da legenda
                </p>
                {TONE_OPTIONS.map((option, idx) => {
                  const Icon = option.icon;
                  const isLoading = toneRewriteLoading === option.id;
                  const isSeparator = idx === 5; // separar tons absolutos dos por-rede
                  return (
                    <div key={option.id}>
                      {isSeparator && <Separator className="my-1" />}
                      <button
                        type="button"
                        disabled={disabled || !!toneRewriteLoading}
                        onClick={() => onRewriteTone?.(option.id)}
                        className={cn(
                          'flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors',
                          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          'disabled:cursor-not-allowed disabled:opacity-60',
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" strokeWidth={1.5} />
                        ) : (
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium leading-tight">{option.label}</span>
                          <span className="block text-[11px] text-muted-foreground">{option.description}</span>
                        </span>
                      </button>
                    </div>
                  );
                })}
                <Separator className="my-1" />
                <p className="px-2 py-1 text-[11px] text-muted-foreground">
                  Consome 1 crédito de IA por uso.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Unified Caption or Network Tabs */}
      {useSeparateCaptions && selectedNetworks.length >= 2 ? (
        <Tabs value={activeNetwork} onValueChange={(v) => setActiveNetwork(v as SocialNetwork)}>
          <TabsList className="h-auto w-full justify-start gap-1.5 overflow-x-auto bg-muted/40 p-1.5 scrollbar-hide sm:flex-wrap">
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
                    "flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 data-[state=active]:bg-background sm:min-h-10",
                    isOverLimit && "text-destructive"
                  )}
                >
                  <Icon className={cn("h-4 w-4", config.color)} />
                  <span className="hidden sm:inline">{config.label}</span>
                  <Badge
                    variant={isOverLimit ? 'destructive' : 'secondary'}
                    className={cn(
                      "manual-chip ml-1",
                      isNearLimit && "bg-warning/20 text-warning"
                    )}
                  >
                    {currentLength}/{maxLength}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {selectedNetworks.map((network) => {
            const currentValue = networkCaptions[network] || '';
            const maxLength = getMaxLength(network);
            const overBy = currentValue.length - maxLength;
            return (
              <TabsContent key={network} value={network} className="mt-3" forceMount
                style={{ display: activeNetwork === network ? 'block' : 'none' }}
              >
                <div className="manual-field-stack">
                  <Textarea
                    ref={(el) => { networkTextareaRefs.current[network] = el; }}
                    value={currentValue}
                    onChange={(e) => {
                      onNetworkCaptionChange(network, e.target.value);
                      resizeTextarea(e.target);
                    }}
                    placeholder={`Legenda para ${NETWORK_CONFIG[network].label}...`}
                    disabled={disabled}
                    autoCapitalize="sentences"
                    className="manual-input-radius manual-scroll-anchor min-h-[220px] max-h-[420px] resize-none"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-manual-micro">
                    <span className={cn('text-muted-foreground', overBy > 0 && 'text-destructive font-medium')}>
                      {NETWORK_CONFIG[network].label}: {currentValue.length}/{maxLength}
                      {overBy > 0 && ` · excede ${overBy} caracteres`}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button type="button" variant="ghost" size="sm" className="manual-touch-target h-11 px-2 text-xs sm:h-7" onClick={() => copyText(currentValue)} disabled={!currentValue}>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copiar texto
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="manual-touch-target h-11 px-2 text-xs sm:h-7" onClick={() => onNetworkCaptionChange(network, caption)} disabled={disabled}>
                        Duplicar da legenda geral
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <div className="manual-field-stack">
          <Textarea
            ref={textareaRef}
            value={caption}
            onChange={(e) => {
              onCaptionChange(e.target.value);
              resizeTextarea(e.target);
            }}
            placeholder="Escreva a sua legenda..."
            disabled={disabled}
            autoCapitalize="sentences"
            className="manual-input-radius manual-scroll-anchor min-h-[220px] max-h-[420px] resize-none"
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
                      "manual-chip",
                      isNearLimit && "bg-warning/20 text-warning"
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
});
