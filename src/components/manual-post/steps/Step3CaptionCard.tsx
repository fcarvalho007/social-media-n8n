import { ReactNode, forwardRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { NetworkCaptionEditor, NetworkCaptionEditorHandle } from '@/components/manual-post/NetworkCaptionEditor';
import { SocialNetwork } from '@/types/social';
import { CaptionRewriteTone } from '@/types/aiEditorial';
import { AIGeneratedField } from '@/components/ai/AIGeneratedField';
import { Button } from '@/components/ui/button';
import { MessageSquareText, RotateCcw } from 'lucide-react';
import { ToneAction } from '@/components/manual-post/ai/CaptionToneToolbar';
import { SectionCard, SectionState } from '@/components/manual-post/ui/SectionCard';
import { NETWORK_CONSTRAINTS } from '@/lib/socialNetworks';
import { NETWORK_ICONS } from '@/lib/networkIcons';

interface Step3CaptionCardProps {
  caption: string;
  onCaptionChange: (value: string) => void;
  networkCaptions: Record<string, string>;
  onNetworkCaptionChange: (network: string, value: string) => void;
  selectedNetworks: SocialNetwork[];
  useSeparateCaptions: boolean;
  onToggleSeparate: (value: boolean) => void;
  captionLength: number;
  maxLength: number;
  disabled: boolean;
  onOpenSavedCaptions: () => void;
  onOpenAIDialog: () => void;
  onRewriteCaption: (tone: CaptionRewriteTone) => Promise<unknown>;
  onRevertRewrite: () => void;
  canRevertRewrite: boolean;
  rewriteLoading: ToneAction | null;
  generatedAt?: string | null;
  generatedEdited?: boolean;
  insightBanner?: ReactNode;

  // Progressive disclosure
  state?: SectionState;
  onActivate?: () => void;
  onEdit?: () => void;
  stepNumber?: number;
}

const CAPTION_EXCERPT_LIMIT = 120;

/**
 * Trunca legenda em palavra completa para usar no summary do estado complete.
 */
function truncateAtWord(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

/**
 * Cartão da legenda (Step 3a). Migrado para `<SectionCard>` no Prompt 2/4 do
 * progressive disclosure: summary em estilo citação, contadores minimalistas
 * (apenas redes que excedem 70% do limite ou estado complete) e numeração 3.
 */
export const Step3CaptionCard = forwardRef<NetworkCaptionEditorHandle, Step3CaptionCardProps>(function Step3CaptionCard(props, ref) {
  const {
    caption,
    onCaptionChange,
    networkCaptions,
    onNetworkCaptionChange,
    selectedNetworks,
    useSeparateCaptions,
    onToggleSeparate,
    captionLength,
    maxLength,
    disabled,
    onOpenSavedCaptions,
    onOpenAIDialog,
    onRewriteCaption,
    onRevertRewrite,
    canRevertRewrite,
    rewriteLoading,
    generatedAt,
    generatedEdited,
    insightBanner,
    state = 'active',
    onActivate,
    onEdit,
    stepNumber = 3,
  } = props;

  // Contadores minimalistas: só mostrar redes onde a legenda excede 70%.
  const minimalCounters = useMemo(() => {
    return selectedNetworks
      .map((network) => {
        const text = useSeparateCaptions ? (networkCaptions[network] || '') : caption;
        const limit = NETWORK_CONSTRAINTS[network]?.max_caption_length || 2200;
        const ratio = limit > 0 ? text.length / limit : 0;
        const config = NETWORK_ICONS[network];
        return { network, length: text.length, limit, ratio, config };
      })
      .filter(({ ratio }) => ratio > 0.7);
  }, [selectedNetworks, useSeparateCaptions, networkCaptions, caption]);

  const titleSuffix = caption.trim().length > 0
    ? ` · ${captionLength} caracter${captionLength === 1 ? '' : 'es'}`
    : '';

  const summary = (
    <div className="space-y-2">
      {useSeparateCaptions ? (
        <p className="text-sm text-muted-foreground">
          Legenda personalizada · {selectedNetworks.length} redes
        </p>
      ) : (
        <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-foreground/85">
          "{truncateAtWord(caption, CAPTION_EXCERPT_LIMIT)}"
        </blockquote>
      )}
      {selectedNetworks.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {selectedNetworks.map((network) => {
            const text = useSeparateCaptions ? (networkCaptions[network] || '') : caption;
            const limit = NETWORK_CONSTRAINTS[network]?.max_caption_length || 2200;
            const ratio = limit > 0 ? text.length / limit : 0;
            const config = NETWORK_ICONS[network];
            const Icon = config.icon;
            const over = text.length > limit;
            const warn = ratio > 0.95;
            const near = ratio > 0.7 && !warn;
            return (
              <span
                key={network}
                className={cn(
                  'inline-flex items-center gap-1 font-medium',
                  over && 'text-destructive',
                  warn && !over && 'text-destructive',
                  near && 'text-warning',
                  !near && !warn && !over && 'text-muted-foreground',
                )}
              >
                <Icon
                  className="h-3.5 w-3.5"
                  style={{ color: !near && !warn && !over ? config.color : undefined }}
                  strokeWidth={1.75}
                />
                {text.length}/{limit}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <SectionCard
      id="caption"
      stepNumber={stepNumber}
      icon={MessageSquareText}
      title={`Legenda${titleSuffix}`}
      state={state}
      onActivate={onActivate}
      onEdit={onEdit}
      summary={caption.trim().length > 0 || useSeparateCaptions ? summary : undefined}
    >
      <div className="manual-group-stack">
        {insightBanner}

        {!useSeparateCaptions && (
          <p className="manual-section-description text-xs text-muted-foreground">
            <span
              className={cn(
                'font-medium',
                captionLength > maxLength * 0.9 && captionLength <= maxLength && 'text-warning',
                captionLength > maxLength && 'text-destructive',
              )}
            >
              {captionLength}/{maxLength}
            </span>
            {' '}caracteres
            {selectedNetworks.includes('linkedin') && (
              <span className="hidden sm:inline"> · obrigatório para LinkedIn</span>
            )}
          </p>
        )}

        <AIGeneratedField generatedAt={generatedAt} edited={generatedEdited} className="border-0 bg-transparent">
          <NetworkCaptionEditor
            ref={ref}
            caption={caption}
            onCaptionChange={onCaptionChange}
            networkCaptions={networkCaptions}
            onNetworkCaptionChange={onNetworkCaptionChange}
            selectedNetworks={selectedNetworks}
            useSeparateCaptions={useSeparateCaptions}
            onToggleSeparate={onToggleSeparate}
            disabled={disabled}
            onOpenSavedCaptions={onOpenSavedCaptions}
            onOpenAIDialog={onOpenAIDialog}
            toneRewriteLoading={rewriteLoading}
            onRewriteTone={onRewriteCaption}
            minimalCounters={minimalCounters}
          />
        </AIGeneratedField>

        {canRevertRewrite && (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={onRevertRewrite} disabled={disabled}>
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
              Reverter última reescrita
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
});
