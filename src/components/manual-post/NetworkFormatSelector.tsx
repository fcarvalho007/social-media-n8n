import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SocialNetwork, PostFormat, NETWORK_POST_FORMATS } from '@/types/social';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SelectedFormatsTags } from './SelectedFormatsTags';
import { QuickPresets } from './QuickPresets';
import { PLATFORM_CONFIGS } from './platformConfig';
import { PlatformIcon } from './platformConfig';
import { cn } from '@/lib/utils';

interface NetworkFormatSelectorProps {
  selectedFormats: PostFormat[];
  onFormatsChange: (formats: PostFormat[]) => void;
}

export function NetworkFormatSelector({ selectedFormats, onFormatsChange }: NetworkFormatSelectorProps) {
  // Get enabled networks with formats
  const enabledNetworks = (Object.keys(PLATFORM_CONFIGS) as SocialNetwork[])
    .filter(network => PLATFORM_CONFIGS[network].enabled && NETWORK_POST_FORMATS[network].length > 0);

  // Count selected formats per network
  const getSelectedCount = (network: SocialNetwork): number => {
    const networkFormats = NETWORK_POST_FORMATS[network];
    return networkFormats.filter(f => selectedFormats.includes(f.format)).length;
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

  // Remove format
  const removeFormat = (format: PostFormat) => {
    onFormatsChange(selectedFormats.filter(f => f !== format));
  };

  // Handle preset selection
  const handlePresetSelect = (formats: PostFormat[]) => {
    onFormatsChange(formats);
  };

  return (
    <Card className="manual-card-shell w-full max-w-[calc(100vw-4px)] box-border sm:max-w-full">
      <CardHeader className="manual-card-content pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="manual-section-title">Seleciona onde publicar</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="manual-card-content manual-group-stack pt-0 overflow-hidden">
        <QuickPresets selectedFormats={selectedFormats} onSelectPreset={handlePresetSelect} />

        <div className="grid overflow-hidden rounded-md border bg-muted/30 md:grid-cols-[minmax(180px,0.85fr)_minmax(0,1.15fr)]">
          <div className="border-b bg-background/70 p-2 md:border-b-0 md:border-r">
            <p className="manual-microcopy px-2 pb-2 font-medium">Redes</p>
            <div className="space-y-1">
              {enabledNetworks.map((network) => {
                const config = PLATFORM_CONFIGS[network];
                const checked = getSelectedCount(network) > 0;
                return (
                  <label
                    key={network}
                    className={cn(
                      'flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors duration-manual-color hover:bg-muted/60 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
                      checked && 'bg-primary/10 text-foreground'
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={(value) => toggleNetwork(network, value)} />
                    <PlatformIcon platform={network} className="h-4 w-4" colored />
                    <span className="truncate font-medium">{config.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="min-h-[220px] p-4">
            {enabledNetworks.some((network) => getSelectedCount(network) > 0) ? (
              <div className="manual-group-stack manual-enter">
                {enabledNetworks.filter((network) => getSelectedCount(network) > 0).map((network) => {
                  const config = PLATFORM_CONFIGS[network];
                  const selected = NETWORK_POST_FORMATS[network].find((item) => selectedFormats.includes(item.format))?.format;
                  return (
                    <div key={network} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <PlatformIcon platform={network} className="h-4 w-4" colored />
                        {config.name}
                      </div>
                      <RadioGroup value={selected} onValueChange={(value) => selectNetworkFormat(network, value as PostFormat)} className="grid gap-2 sm:grid-cols-2">
                        {NETWORK_POST_FORMATS[network].map((format) => (
                          <label key={format.format} className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-2 text-sm transition-colors duration-manual-color hover:bg-muted/40 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                            <RadioGroupItem value={format.format} className="mt-0.5" />
                            <span className="min-w-0">
                              <span className="block font-medium leading-none">{format.label}</span>
                              <span className="mt-1 block text-xs leading-snug text-muted-foreground">{format.description}</span>
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
      </CardContent>
    </Card>
  );
}
