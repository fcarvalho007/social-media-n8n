import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { SectionHelp, getSectionTooltip } from '@/components/manual-post/SectionHelp';
import { NetworkCaptionEditor, NetworkCaptionEditorHandle } from '@/components/manual-post/NetworkCaptionEditor';
import { SocialNetwork } from '@/types/social';
import { CaptionRewritePanel } from '@/components/manual-post/ai/CaptionRewritePanel';
import { CaptionRewriteTone } from '@/types/aiEditorial';
import { AIGeneratedField } from '@/components/ai/AIGeneratedField';

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
  rewriteTone: CaptionRewriteTone;
  onRewriteToneChange: (tone: CaptionRewriteTone) => void;
  onRewriteCaption: () => void;
  rewriteLoading: boolean;
  generatedAt?: string | null;
  generatedEdited?: boolean;
}

/**
 * Cartão da legenda (Step 3a). Apresenta contador de caracteres e o
 * `NetworkCaptionEditor` que suporta legenda unificada ou diferenciada por rede.
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
    rewriteTone,
    onRewriteToneChange,
    onRewriteCaption,
    rewriteLoading,
    generatedAt,
    generatedEdited,
  } = props;

  return (
    <Card className="border-0 sm:border shadow-none sm:shadow-sm">
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
        <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
          Legenda
          <SectionHelp content={getSectionTooltip('caption')} />
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {!useSeparateCaptions && (
            <>
              <span
                className={cn(
                  'font-medium',
                  captionLength > maxLength * 0.9 && captionLength <= maxLength && 'text-orange-500',
                  captionLength > maxLength && 'text-destructive',
                )}
              >
                {captionLength}/{maxLength}
              </span>
              {' '}caracteres
            </>
          )}
          {selectedNetworks.includes('linkedin') && (
            <span className="hidden sm:inline"> (obrigatório para LinkedIn)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-4 sm:pb-6">
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
          />
        </AIGeneratedField>
        <CaptionRewritePanel
          tone={rewriteTone}
          onToneChange={onRewriteToneChange}
          onRewrite={onRewriteCaption}
          loading={rewriteLoading}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
});
