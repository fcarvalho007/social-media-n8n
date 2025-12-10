import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SocialNetwork, PostFormat, NETWORK_POST_FORMATS } from '@/types/social';
import { PlatformChip } from './PlatformChip';
import { FormatsPanel } from './FormatsPanel';
import { SelectedFormatsTags } from './SelectedFormatsTags';
import { PLATFORM_CONFIGS } from './platformConfig';

interface NetworkFormatSelectorProps {
  selectedFormats: PostFormat[];
  onFormatsChange: (formats: PostFormat[]) => void;
}

export function NetworkFormatSelector({ selectedFormats, onFormatsChange }: NetworkFormatSelectorProps) {
  const [expandedPlatform, setExpandedPlatform] = useState<SocialNetwork | null>(null);

  // Get enabled networks with formats
  const enabledNetworks = (Object.keys(PLATFORM_CONFIGS) as SocialNetwork[])
    .filter(network => PLATFORM_CONFIGS[network].enabled && NETWORK_POST_FORMATS[network].length > 0);

  // Count selected formats per network
  const getSelectedCount = (network: SocialNetwork): number => {
    const networkFormats = NETWORK_POST_FORMATS[network];
    return networkFormats.filter(f => selectedFormats.includes(f.format)).length;
  };

  // Toggle expand/collapse platform
  const toggleExpand = (network: SocialNetwork) => {
    setExpandedPlatform(prev => prev === network ? null : network);
  };

  // Toggle format selection
  const toggleFormat = (format: PostFormat) => {
    onFormatsChange(
      selectedFormats.includes(format)
        ? selectedFormats.filter(f => f !== format)
        : [...selectedFormats, format]
    );
  };

  // Remove format
  const removeFormat = (format: PostFormat) => {
    onFormatsChange(selectedFormats.filter(f => f !== format));
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Selecione onde pretende publicar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {/* Platform Chips Bar */}
        <div 
          className="platform-chips flex gap-3 flex-wrap overflow-x-auto pb-2 -mx-2 px-2"
          role="tablist"
          aria-label="Plataformas disponíveis"
        >
          {enabledNetworks.map((network) => (
            <PlatformChip
              key={network}
              platform={network}
              selectedCount={getSelectedCount(network)}
              isExpanded={expandedPlatform === network}
              onClick={() => toggleExpand(network)}
            />
          ))}
        </div>

        {/* Formats Panel (conditional) */}
        {expandedPlatform && (
          <FormatsPanel
            platform={expandedPlatform}
            formats={NETWORK_POST_FORMATS[expandedPlatform]}
            selectedFormats={selectedFormats}
            onToggleFormat={toggleFormat}
            onClose={() => setExpandedPlatform(null)}
          />
        )}

        {/* Selected Formats Tags */}
        <SelectedFormatsTags
          selectedFormats={selectedFormats}
          onRemove={removeFormat}
        />
      </CardContent>
    </Card>
  );
}
