import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SectionHelp, getSectionTooltip } from '@/components/manual-post/SectionHelp';
import { NetworkCaptionEditor } from '@/components/manual-post/NetworkCaptionEditor';

interface Step3CaptionCardProps {
  caption: string;
  onCaptionChange: (value: string) => void;
  networkCaptions: Record<string, string>;
  onNetworkCaptionChange: (network: string, value: string) => void;
  selectedNetworks: string[];
  useSeparateCaptions: boolean;
  onToggleSeparate: (value: boolean) => void;
  captionLength: number;
  maxLength: number;
  disabled: boolean;
  onOpenSavedCaptions: () => void;
  onOpenAIDialog: () => void;
}

/**
 * Cartão da legenda (Step 3a). Apresenta contador de caracteres e o
 * `NetworkCaptionEditor` que suporta legenda unificada ou diferenciada por rede.
 */
export function Step3CaptionCard(props: Step3CaptionCardProps) {
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
        <NetworkCaptionEditor
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
      </CardContent>
    </Card>
  );
}
