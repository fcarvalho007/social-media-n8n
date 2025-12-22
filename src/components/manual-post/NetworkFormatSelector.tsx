import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SocialNetwork, PostFormat, NETWORK_POST_FORMATS } from '@/types/social';
import { PlatformChip } from './PlatformChip';
import { FormatsPanel } from './FormatsPanel';
import { SelectedFormatsTags } from './SelectedFormatsTags';
import { QuickPresets } from './QuickPresets';
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

  // Handle preset selection
  const handlePresetSelect = (formats: PostFormat[]) => {
    onFormatsChange(formats);
    setExpandedPlatform(null); // Close any open panel
  };

  return (
    <Card className="overflow-hidden border-0 sm:border shadow-none sm:shadow-sm">
      <CardHeader className="pb-1 sm:pb-2 px-0 sm:px-6 pt-0 sm:pt-6">
        <CardTitle className="text-sm sm:text-lg font-semibold">Selecione onde publicar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 px-0 sm:px-6 pb-0 sm:pb-6">
        {/* Quick Presets */}
        <QuickPresets
          selectedFormats={selectedFormats}
          onSelectPreset={handlePresetSelect}
        />

        {/* Platform Chips - Responsive grid on mobile, flex on desktop */}
        <div 
          className="platform-chips grid grid-cols-2 xs:grid-cols-3 gap-1.5 sm:flex sm:gap-3 sm:flex-wrap pb-2 sm:pb-0"
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
