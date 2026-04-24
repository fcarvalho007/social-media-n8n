import { useMemo } from 'react';
import { Share2 } from 'lucide-react';
import { SocialNetwork, PostFormat, NETWORK_POST_FORMATS, getNetworkFromFormat, getFormatConfig } from '@/types/social';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SelectedFormatsTags } from './SelectedFormatsTags';
import { QuickPresets } from './QuickPresets';
import { PLATFORM_CONFIGS } from './platformConfig';
import { SectionCard, SectionState } from './ui/SectionCard';
import { NETWORK_ICONS } from '@/lib/networkIcons';
import { cn } from '@/lib/utils';

interface NetworkFormatSelectorProps {
  selectedFormats: PostFormat[];
  onFormatsChange: (formats: PostFormat[]) => void;
  /** Estado de progressive disclosure controlado pelo pai. */
  state?: SectionState;
  onActivate?: () => void;
  onEdit?: () => void;
  /** Número ordinal mostrado no header da SectionCard. */
  stepNumber?: number;
}

const MAX_VISIBLE_CHIPS = 8;

export function NetworkFormatSelector({
  selectedFormats,
  onFormatsChange,
  state = 'active',
  onActivate,
  onEdit,
  stepNumber = 1,
}: NetworkFormatSelectorProps) {
  const enabledNetworks = (Object.keys(PLATFORM_CONFIGS) as SocialNetwork[]).filter(
    (network) => PLATFORM_CONFIGS[network].enabled && NETWORK_POST_FORMATS[network].length > 0,
  );

  const getSelectedCount = (network: SocialNetwork): number => {
    const networkFormats = NETWORK_POST_FORMATS[network];
    return networkFormats.filter((f) => selectedFormats.includes(f.format)).length;
  };

  const getNetworkFormats = (network: SocialNetwork) => NETWORK_POST_FORMATS[network].map((item) => item.format);

  const toggleNetwork = (network: SocialNetwork, checked: boolean | string) => {
    const networkFormats = getNetworkFormats(network);
    if (checked) {
      const firstFormat = NETWORK_POST_FORMATS[network][0]?.format;
      if (firstFormat && !selectedFormats.some((format) => networkFormats.includes(format))) {
        onFormatsChange([...selectedFormats, firstFormat]);
      }
      return;
    }
    onFormatsChange(selectedFormats.filter((format) => !networkFormats.includes(format)));
  };

  const selectNetworkFormat = (network: SocialNetwork, format: PostFormat) => {
    const networkFormats = getNetworkFormats(network);
    onFormatsChange([...selectedFormats.filter((item) => !networkFormats.includes(item)), format]);
  };

  const removeFormat = (format: PostFormat) => {
    onFormatsChange(selectedFormats.filter((f) => f !== format));
  };

  const handlePresetSelect = (formats: PostFormat[]) => {
    onFormatsChange(formats);
  };

  // Summary: chips coloridos por formato seleccionado, com cap em 8 + "+N".
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
        <QuickPresets selectedFormats={selectedFormats} onSelectPreset={handlePresetSelect} />

        <div className="grid overflow-hidden rounded-lg border bg-muted/20 md:grid-cols-[minmax(180px,0.85fr)_minmax(0,1.15fr)]">
          <div className="border-b bg-background/70 p-3 md:border-b-0 md:border-r">
            <p className="manual-field-label px-1 pb-2 text-muted-foreground">Redes</p>
            <div className="space-y-1">
              {enabledNetworks.map((network) => {
                const config = PLATFORM_CONFIGS[network];
                const checked = getSelectedCount(network) > 0;
                const Icon = NETWORK_ICONS[network].icon;
                const color = NETWORK_ICONS[network].color;
                return (
                  <label
                    key={network}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors duration-manual-color hover:bg-muted/60 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
                      checked && 'bg-primary/10 text-foreground',
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={(value) => toggleNetwork(network, value)} />
                    <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color }} aria-hidden="true" />
                    <span className="truncate font-medium">{config.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="min-h-[220px] p-3 sm:p-4">
            {enabledNetworks.some((network) => getSelectedCount(network) > 0) ? (
              <div className="manual-group-stack manual-enter">
                {enabledNetworks
                  .filter((network) => getSelectedCount(network) > 0)
                  .map((network) => {
                    const config = PLATFORM_CONFIGS[network];
                    const Icon = NETWORK_ICONS[network].icon;
                    const color = NETWORK_ICONS[network].color;
                    const selected = NETWORK_POST_FORMATS[network].find((item) =>
                      selectedFormats.includes(item.format),
                    )?.format;
                    return (
                      <div key={network} className="manual-field-stack">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Icon className="h-4 w-4" strokeWidth={1.5} style={{ color }} aria-hidden="true" />
                          {config.name}
                        </div>
                        <RadioGroup
                          value={selected}
                          onValueChange={(value) => selectNetworkFormat(network, value as PostFormat)}
                          className="grid gap-2 sm:grid-cols-2"
                        >
                          {NETWORK_POST_FORMATS[network].map((format) => (
                            <label
                              key={format.format}
                              className="manual-option-button flex min-h-14 cursor-pointer items-start gap-2 p-3 text-sm"
                            >
                              <RadioGroupItem value={format.format} className="mt-0.5" />
                              <span className="min-w-0">
                                <span className="block font-medium leading-none">{format.label}</span>
                                <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                                  {format.description}
                                </span>
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex h-full min-h-[180px] items-center justify-center text-center text-sm text-muted-foreground">
                Seleciona uma rede para escolher o formato.
              </div>
            )}
          </div>
        </div>

        <SelectedFormatsTags selectedFormats={selectedFormats} onRemove={removeFormat} />
      </div>
    </SectionCard>
  );
}
