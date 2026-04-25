import { useMemo } from 'react';
import { Share2 } from 'lucide-react';
import {
  SocialNetwork,
  PostFormat,
  NETWORK_POST_FORMATS,
  getNetworkFromFormat,
  getFormatConfig,
} from '@/types/social';
import { VisualPresets } from './VisualPresets';
import { NetworkChipSelector, SelectionSummaryBar } from './NetworkChipSelector';
import { SectionCard, SectionState } from './ui/SectionCard';
import { NETWORK_ICONS } from '@/lib/networkIcons';

/**
 * Secção 1 — "Seleciona onde publicar".
 *
 * Estrutura visual (redesenho 2026-04):
 *   1. Presets visuais ricos (`VisualPresets`) com SVG + ícones de rede.
 *   2. `NetworkChipSelector` — chips 80x80 + blocos condicionais de
 *      formato por rede.
 *   3. `SelectionSummaryBar` — barra de sucesso só visível com ≥1 seleção.
 *
 * A lógica de seleção, validação e progressive disclosure permanece
 * inalterada: este componente é uma fina camada de apresentação que
 * chama `onFormatsChange` com o array final de formatos.
 */
const MAX_VISIBLE_CHIPS = 8;

interface NetworkFormatSelectorProps {
  selectedFormats: PostFormat[];
  onFormatsChange: (formats: PostFormat[]) => void;
  state?: SectionState;
  onActivate?: () => void;
  onEdit?: () => void;
  stepNumber?: number;
}

export function NetworkFormatSelector({
  selectedFormats,
  onFormatsChange,
  state = 'active',
  onActivate,
  onEdit,
  stepNumber = 1,
}: NetworkFormatSelectorProps) {
  const getNetworkFormats = (network: SocialNetwork) =>
    NETWORK_POST_FORMATS[network].map((item) => item.format);

  // Toggle network: ao activar, adiciona o primeiro formato; ao desactivar,
  // remove todos os formatos dessa rede do array global.
  const handleToggleNetwork = (network: SocialNetwork, checked: boolean) => {
    const networkFormats = getNetworkFormats(network);
    if (checked) {
      const firstFormat = NETWORK_POST_FORMATS[network][0]?.format;
      if (firstFormat && !selectedFormats.some((f) => networkFormats.includes(f))) {
        onFormatsChange([...selectedFormats, firstFormat]);
      }
      return;
    }
    onFormatsChange(selectedFormats.filter((format) => !networkFormats.includes(format)));
  };

  // Trocar o formato dentro de uma rede (mantém apenas 1 por rede).
  const handleSelectFormat = (network: SocialNetwork, format: PostFormat) => {
    const networkFormats = getNetworkFormats(network);
    onFormatsChange([
      ...selectedFormats.filter((item) => !networkFormats.includes(item)),
      format,
    ]);
  };

  // Summary (estado collapsed) — chips coloridos com cap em 8.
  const summaryItems = useMemo(() => {
    return selectedFormats.map((format) => {
      const config = getFormatConfig(format);
      const network = getNetworkFromFormat(format);
      const icon = NETWORK_ICONS[network];
      return {
        format,
        label: config?.label ?? format,
        network,
        color: icon.color,
        Icon: icon.icon,
      };
    });
  }, [selectedFormats]);

  const summary = (
    <div className="flex flex-wrap items-center gap-1.5">
      {summaryItems.slice(0, MAX_VISIBLE_CHIPS).map((item) => (
        <span
          key={item.format}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs font-medium text-foreground"
          style={{ borderColor: `${item.color}40` }}
        >
          <item.Icon className="h-3 w-3" strokeWidth={1.5} style={{ color: item.color }} aria-hidden="true" />
          <span>{item.label}</span>
        </span>
      ))}
      {summaryItems.length > MAX_VISIBLE_CHIPS && (
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          +{summaryItems.length - MAX_VISIBLE_CHIPS} mais
        </span>
      )}
    </div>
  );

  const titleSuffix = selectedFormats.length > 0
    ? ` · ${selectedFormats.length} ${selectedFormats.length === 1 ? 'formato' : 'formatos'}`
    : '';

  return (
    <SectionCard
      id="networks"
      stepNumber={stepNumber}
      icon={Share2}
      title={`Seleciona onde publicar${titleSuffix}`}
      state={state}
      onActivate={onActivate}
      onEdit={onEdit}
      summary={summaryItems.length > 0 ? summary : undefined}
    >
      <div className="manual-group-stack overflow-hidden">
        <VisualPresets
          selectedFormats={selectedFormats}
          onSelectPreset={onFormatsChange}
        />

        <NetworkChipSelector
          selectedFormats={selectedFormats}
          onToggleNetwork={handleToggleNetwork}
          onSelectFormat={handleSelectFormat}
        />

        <SelectionSummaryBar selectedFormats={selectedFormats} />
      </div>
    </SectionCard>
  );
}
