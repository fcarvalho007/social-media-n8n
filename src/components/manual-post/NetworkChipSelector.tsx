import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PostFormat,
  SocialNetwork,
  NETWORK_POST_FORMATS,
  getFormatConfig,
  getNetworkFromFormat,
} from '@/types/social';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NETWORK_ICONS } from '@/lib/networkIcons';
import { PLATFORM_CONFIGS } from './platformConfig';

/**
 * Selector unificado em duas etapas:
 *   A) Chips horizontais 80x80 com ícone colorido + nome (toggle).
 *   B) Para cada rede seleccionada, um bloco com radio grande de formatos.
 *
 * Substitui a antiga UI de duas colunas por uma estrutura mais directa
 * e visualmente coerente. NÃO contém lógica de seleção própria — recebe
 * `selectedFormats` e emite alterações via callbacks.
 */
interface NetworkChipSelectorProps {
  selectedFormats: PostFormat[];
  onToggleNetwork: (network: SocialNetwork, checked: boolean) => void;
  onSelectFormat: (network: SocialNetwork, format: PostFormat) => void;
}

export function NetworkChipSelector({
  selectedFormats,
  onToggleNetwork,
  onSelectFormat,
}: NetworkChipSelectorProps) {
  const enabledNetworks = (Object.keys(PLATFORM_CONFIGS) as SocialNetwork[]).filter(
    (network) => PLATFORM_CONFIGS[network].enabled && NETWORK_POST_FORMATS[network].length > 0,
  );

  const isNetworkSelected = (network: SocialNetwork) => {
    const formats = NETWORK_POST_FORMATS[network].map((f) => f.format);
    return formats.some((f) => selectedFormats.includes(f));
  };

  return (
    <div className="manual-group-stack">
      <div>
        <p className="manual-field-label mb-2 text-muted-foreground">Ou personaliza a tua seleção</p>
        {/* Mobile: scroll horizontal com snap. Desktop: flex wrap */}
        <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
          <div className="flex gap-3 sm:flex-wrap">
            {enabledNetworks.map((network) => (
              <NetworkChip
                key={network}
                network={network}
                selected={isNetworkSelected(network)}
                onToggle={(value) => onToggleNetwork(network, value)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Etapa B: blocos por rede seleccionada */}
      {enabledNetworks.some(isNetworkSelected) && (
        <div className="manual-group-stack manual-enter">
          {enabledNetworks
            .filter(isNetworkSelected)
            .map((network) => (
              <FormatBlock
                key={network}
                network={network}
                selectedFormats={selectedFormats}
                onSelectFormat={(format) => onSelectFormat(network, format)}
              />
            ))}
        </div>
      )}
    </div>
  );
}

interface NetworkChipProps {
  network: SocialNetwork;
  selected: boolean;
  onToggle: (selected: boolean) => void;
}

function NetworkChip({ network, selected, onToggle }: NetworkChipProps) {
  const config = PLATFORM_CONFIGS[network];
  const Icon = NETWORK_ICONS[network].icon;
  const color = NETWORK_ICONS[network].color;

  // Connection status: por agora todas as redes habilitadas são consideradas
  // conectadas — o sistema só expõe redes enabled. Mantém-se o gancho para
  // futura integração com `social_profiles.connection_status`.
  const isConnected = true;

  const button = (
    <button
      type="button"
      onClick={() => onToggle(!selected)}
      disabled={!isConnected}
      aria-pressed={selected}
      aria-label={`${selected ? 'Desselecionar' : 'Selecionar'} ${config.name}`}
      className={cn(
        'group relative flex h-20 w-20 flex-shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border bg-card transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        !isConnected && 'cursor-not-allowed opacity-50 hover:translate-y-0 hover:shadow-none',
      )}
      style={
        selected
          ? { borderColor: `${color}80`, backgroundColor: `${color}14` }
          : undefined
      }
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
      <Icon className="h-7 w-7" strokeWidth={1.5} style={{ color }} aria-hidden="true" />
      <span className="text-[11px] font-medium leading-none text-foreground">{config.shortName}</span>
      {/* Estado anunciado a leitores de ecrã (complementa `aria-pressed`
          e prepara o terreno para conexão real via social_profiles). */}
      <span className="sr-only">
        {isConnected ? 'Conta conectada' : 'Conta não conectada — abre Definições para conectar'}
        {selected ? ' · selecionada' : ''}
      </span>
    </button>
  );

  if (isConnected) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>Conectar nas Definições</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface FormatBlockProps {
  network: SocialNetwork;
  selectedFormats: PostFormat[];
  onSelectFormat: (format: PostFormat) => void;
}

function FormatBlock({ network, selectedFormats, onSelectFormat }: FormatBlockProps) {
  const config = PLATFORM_CONFIGS[network];
  const Icon = NETWORK_ICONS[network].icon;
  const color = NETWORK_ICONS[network].color;
  const formats = NETWORK_POST_FORMATS[network];
  const selected = formats.find((f) => selectedFormats.includes(f.format))?.format;

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: `${color}33`,
        backgroundColor: `${color}0a`,
      }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color }} aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground">{config.name}</span>
      </div>
      <RadioGroup
        value={selected}
        onValueChange={(value) => onSelectFormat(value as PostFormat)}
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        {formats.map((format) => (
          <label
            key={format.format}
            className={cn(
              'flex min-h-10 cursor-pointer items-center gap-2 rounded-md border bg-card/60 px-3 py-2 text-sm transition-colors duration-150',
              'hover:bg-card focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
              selected === format.format && 'border-primary bg-primary/5',
            )}
          >
            <RadioGroupItem value={format.format} />
            <span className="font-medium leading-none text-foreground">{format.label}</span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

/**
 * Barra de resumo verde — só renderiza quando há ≥1 formato seleccionado.
 * Substitui o antigo "Selecionados: Nenhum formato" (redundante).
 */
interface SelectionSummaryBarProps {
  selectedFormats: PostFormat[];
}

export function SelectionSummaryBar({ selectedFormats }: SelectionSummaryBarProps) {
  if (selectedFormats.length === 0) return null;

  return (
    <div
      className="mt-4 flex flex-col gap-2 rounded-lg border border-success/20 bg-success/5 p-3"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
        <span>
          {selectedFormats.length} {selectedFormats.length === 1 ? 'formato selecionado' : 'formatos selecionados'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {selectedFormats.map((format) => {
          const cfg = getFormatConfig(format);
          const network = getNetworkFromFormat(format);
          const Icon = NETWORK_ICONS[network].icon;
          const color = NETWORK_ICONS[network].color;
          return (
            <span
              key={format}
              className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs font-medium text-foreground"
              style={{ borderColor: `${color}40` }}
            >
              <Icon className="h-3 w-3" strokeWidth={1.5} style={{ color }} aria-hidden="true" />
              <span>{cfg?.label ?? format}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
