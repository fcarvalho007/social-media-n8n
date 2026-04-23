import { type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Eye, type LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { PostFormat, getNetworkFromFormat, getFormatConfig } from '@/types/social';

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
  } = props;

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
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
            <Eye className="h-8 w-8 opacity-50" />
            <span>Selecione um formato para ver a pré-visualização</span>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          Selecione um formato para ver a pré-visualização
        </div>
      );
    }

    if (selectedFormats.length === 1) {
      return (
        <div className={variant === 'mobile' ? 'space-y-4' : undefined}>
          {renderPreview(selectedFormats[0])}
          <ScheduledLabel />
        </div>
      );
    }

    const tabValue =
      variant === 'mobile' ? activePreviewTab || selectedFormats[0] : activePreviewTab;

    return (
      <Tabs value={tabValue} onValueChange={onActivePreviewTabChange}>
        <TabsList className="w-full mb-4">
          {selectedFormats.map((formatItem) => {
            const network = getNetworkFromFormat(formatItem);
            const Icon = getNetworkIcon(network);
            const config = getFormatConfig(formatItem);
            return (
              <TabsTrigger
                key={formatItem}
                value={formatItem}
                className={
                  variant === 'mobile' ? 'flex-1 gap-1' : 'flex-1 gap-1.5'
                }
              >
                <Icon className="h-4 w-4" />
                <span
                  className={
                    variant === 'mobile'
                      ? 'text-xs truncate'
                      : 'hidden sm:inline text-xs'
                  }
                >
                  {config?.label}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {selectedFormats.map((formatItem) => (
          <TabsContent key={formatItem} value={formatItem}>
            {renderPreview(formatItem)}
          </TabsContent>
        ))}
        {variant === 'desktop' && <ScheduledLabel />}
      </Tabs>
    );
  })();

  if (variant === 'mobile') {
    return <>{body}</>;
  }

  return (
    <div className="hidden lg:block lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] overflow-auto">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>Como ficará a sua publicação</CardDescription>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    </div>
  );
}
