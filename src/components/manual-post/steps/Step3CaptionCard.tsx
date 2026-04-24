import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { SectionHelp, getSectionTooltip } from '@/components/manual-post/SectionHelp';
import { NetworkCaptionEditor, NetworkCaptionEditorHandle } from '@/components/manual-post/NetworkCaptionEditor';
import { SocialNetwork } from '@/types/social';
import { CaptionRewriteTone } from '@/types/aiEditorial';
import { AIGeneratedField } from '@/components/ai/AIGeneratedField';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

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
  rewriteLoading: CaptionRewriteTone | null;
  generatedAt?: string | null;
  generatedEdited?: boolean;
  insightBanner?: ReactNode;
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
    onRewriteCaption,
    onRevertRewrite,
    canRevertRewrite,
    rewriteLoading,
    generatedAt,
    generatedEdited,
    insightBanner,
  } = props;

  return (
    <Card className="manual-card-shell">
      <CardHeader className="manual-card-content pb-3">
        <CardTitle className="manual-section-title flex items-center gap-2">
          Legenda
          <SectionHelp content={getSectionTooltip('caption')} />
        </CardTitle>
        <CardDescription className="manual-section-description">
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
      <CardContent className="manual-card-content manual-group-stack pt-0">
        {insightBanner}
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
      </CardContent>
    </Card>
  );
});
