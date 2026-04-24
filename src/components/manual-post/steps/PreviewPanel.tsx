import { type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Eye, Expand, File, FileText, Image, LayoutGrid, MapPin, Play, Video, Circle, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { PostFormat, getNetworkFromFormat, getFormatConfig } from '@/types/social';
import { cn } from '@/lib/utils';
import { AutoSaveIndicator } from '@/components/manual-post/NoAccountsState';

interface PreviewPanelProps {
  /** `desktop` para o painel lateral fixo, `mobile` para o conteúdo do drawer. */
  variant: 'desktop' | 'mobile';
  selectedFormats: PostFormat[];
  activePreviewTab: string;
  onActivePreviewTabChange: (tab: string) => void;
  scheduledDate: Date | undefined;
  scheduleAsap: boolean;
  time: string;
  renderPreview: (format: PostFormat) => ReactNode;
  getNetworkIcon: (network: string) => LucideIcon;
  caption: string;
  networkCaptions: Record<string, string>;
  useSeparateCaptions: boolean;
  mediaCount: number;
  lastSaved: Date | null;
  isAutoSaving: boolean;
  hasUnsavedChanges: boolean;
}

/**
 * Painel de pré-visualização. Renderiza um único preview ou um sistema de
 * `Tabs` quando há múltiplos formatos seleccionados. Reutilizado em desktop
 * (sidebar fixa) e mobile (dentro de `Drawer`).
 */
export function PreviewPanel(props: PreviewPanelProps) {
  const {
    variant,
    selectedFormats,
    activePreviewTab,
    onActivePreviewTabChange,
    scheduledDate,
    scheduleAsap,
    time,
    renderPreview,
    getNetworkIcon,
    caption,
    networkCaptions,
    useSeparateCaptions,
    mediaCount,
    lastSaved,
    isAutoSaving,
    hasUnsavedChanges,
  } = props;
  const [expandedOpen, setExpandedOpen] = useState(false);

  const getFormatIcon = (icon?: string): LucideIcon => {
    switch (icon) {
      case 'LayoutGrid': return LayoutGrid;
      case 'Image': return Image;
      case 'Video': return Video;
      case 'Play': return Play;
      case 'File': return File;
      case 'MapPin': return MapPin;
      case 'Circle': return Circle;
      default: return FileText;
    }
  };

  const getPreviewCaption = (formatItem: PostFormat) => {
    const network = getNetworkFromFormat(formatItem);
    return useSeparateCaptions ? networkCaptions[network] || caption : caption;
  };

  const activeFormat = (variant === 'mobile' ? activePreviewTab || selectedFormats[0] : activePreviewTab || selectedFormats[0]) as PostFormat | undefined;
  const activeCaption = activeFormat ? getPreviewCaption(activeFormat) : caption;
  const hashtagCount = (activeCaption.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
  const scheduleLabel = scheduledDate && !scheduleAsap
    ? `${format(scheduledDate, 'dd/MM', { locale: pt })} · ${time}`
    : 'Imediato';

  // Limite de legenda por rede activa (em chars). YouTube usa descrição.
  const CAPTION_LIMITS: Record<string, number> = {
    instagram: 2200,
    linkedin: 3000,
    facebook: 63206,
    x: 280,
    tiktok: 2200,
    youtube: 5000,
    googlebusiness: 1500,
  };
  const activeNetwork = activeFormat ? getNetworkFromFormat(activeFormat) : 'instagram';
  const activeLimit = CAPTION_LIMITS[activeNetwork] ?? 2200;
  const overLimit = activeCaption.length > activeLimit;
  const nearLimit = activeCaption.length > activeLimit * 0.8 && !overLimit;

  const PreviewTabs = ({ compact = true }: { compact?: boolean }) => (
    <TabsList className={cn(
      'mb-4 h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0 scrollbar-hide',
      compact ? 'snap-x' : 'flex-wrap'
    )}>
      {selectedFormats.map((formatItem) => {
        const network = getNetworkFromFormat(formatItem);
        const NetworkIcon = getNetworkIcon(network);
        const config = getFormatConfig(formatItem);
        const FormatIcon = getFormatIcon(config?.icon);
        return (
          <TooltipProvider key={formatItem} delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value={formatItem}
                  className={cn(
                      'relative h-11 w-11 shrink-0 snap-start rounded-md border border-border bg-background p-0 text-muted-foreground shadow-none transition-colors duration-manual-color focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-10 sm:w-10',
                    'data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none'
                  )}
                  aria-label={config?.label ?? formatItem}
                >
                  <NetworkIcon className="h-5 w-5" />
                  <span className="absolute bottom-0.5 right-0.5 rounded-sm bg-muted p-0.5 text-muted-foreground group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
                    <FormatIcon className="h-2.5 w-2.5" />
                  </span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{config?.label ?? formatItem}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </TabsList>
  );

  const Metadata = () => (
    <div className="mt-4 border-t border-border/40 pt-3">
      <div className="grid grid-cols-3 gap-2 text-manual-hint">
        <div>
          <p className="text-muted-foreground">Legenda</p>
          <p className={cn('font-medium', activeCaption.length >= 2090 && 'text-destructive', activeCaption.length >= 1760 && activeCaption.length < 2090 && 'text-warning')}>{activeCaption.length} / 2200</p>
        </div>
        <div>
          <p className="text-muted-foreground">Hashtags</p>
          <p className="font-medium">{hashtagCount}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Agendamento</p>
          <p className="font-medium truncate">{scheduleLabel}</p>
        </div>
      </div>
      <p className="manual-microcopy mt-2">{mediaCount} {mediaCount === 1 ? 'ficheiro' : 'ficheiros'}</p>
    </div>
  );

  const ScheduledLabel = () =>
    scheduledDate && !scheduleAsap ? (
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 justify-center">
        <Clock className="h-3 w-3" />
        <span>
          Agendado: {format(scheduledDate, 'dd/MM/yyyy', { locale: pt })} às {time}
        </span>
      </div>
    ) : null;

  const body = (() => {
    if (selectedFormats.length === 0) {
      if (variant === 'mobile') {
        return (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
            <Eye className="h-12 w-12 opacity-40" />
            <span className="max-w-52 leading-relaxed">Seleciona uma rede para ver a pré-visualização.</span>
          </div>
        );
      }
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
          <Eye className="h-14 w-14 opacity-40" />
          <span className="max-w-56 leading-relaxed">Seleciona uma rede para ver a pré-visualização.</span>
        </div>
      );
    }

    if (selectedFormats.length === 1) {
      return (
        <div className={variant === 'mobile' ? 'space-y-4' : undefined}>
          {renderPreview(selectedFormats[0])}
          <Metadata />
          <ScheduledLabel />
        </div>
      );
    }

    const tabValue =
      variant === 'mobile' ? activePreviewTab || selectedFormats[0] : activePreviewTab;

    return (
      <Tabs value={tabValue} onValueChange={onActivePreviewTabChange}>
        <PreviewTabs />
        {selectedFormats.map((formatItem) => (
          <TabsContent key={formatItem} value={formatItem} className="mt-0">
            {renderPreview(formatItem)}
          </TabsContent>
        ))}
        <Metadata />
        {variant === 'desktop' && <ScheduledLabel />}
      </Tabs>
    );
  })();

  if (variant === 'mobile') {
    return <>{body}</>;
  }

  return (
    <div className="hidden overflow-auto lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-8rem)]">
      <Card className="card-secondary h-full shadow-[0_18px_45px_hsl(var(--foreground)/0.08)]">
        <CardHeader className="p-5 pb-3">
          <div className="manual-card-header-row">
            <CardTitle className="manual-section-title manual-card-title-row">
              <span className="manual-icon-box"><Eye className="h-5 w-5" strokeWidth={1.5} /></span>
              <span>Pré-visualização</span>
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <AutoSaveIndicator lastSaved={lastSaved} isSaving={isAutoSaving} hasUnsavedChanges={hasUnsavedChanges} />
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedOpen(true)} aria-label="Expandir pré-visualização">
                <Expand className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-0">{body}</CardContent>
      </Card>
      <Dialog open={expandedOpen} onOpenChange={setExpandedOpen}>
        <DialogContent className="h-[92vh] max-w-[96vw] overflow-hidden p-4 sm:p-6">
          <DialogTitle>Pré-visualização expandida</DialogTitle>
          <div className="h-full overflow-auto pr-1">
            {selectedFormats.length > 0 ? (
              <Tabs value={activePreviewTab || selectedFormats[0]} onValueChange={onActivePreviewTabChange}>
                <PreviewTabs compact={false} />
                <div className="grid gap-4 xl:grid-cols-2">
                  {selectedFormats.map((formatItem) => (
                    <TabsContent key={formatItem} value={formatItem} className="mt-0 rounded-md border bg-muted/30 p-4">
                      <p className="mb-3 text-sm font-medium text-muted-foreground">{getFormatConfig(formatItem)?.label}</p>
                      {renderPreview(formatItem)}
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground"><Eye className="h-14 w-14 opacity-40" />Seleciona uma rede para ver a pré-visualização.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
