import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SocialNetwork, PostFormat, NETWORK_POST_FORMATS } from '@/types/social';
import { PlatformChip } from './PlatformChip';
import { FormatsPanel } from './FormatsPanel';
import { SelectedFormatsTags } from './SelectedFormatsTags';
import { QuickPresets } from './QuickPresets';
import { CollapsedFormatsSummary } from './CollapsedFormatsSummary';
import { PLATFORM_CONFIGS } from './platformConfig';
import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NetworkFormatSelectorProps {
  selectedFormats: PostFormat[];
  onFormatsChange: (formats: PostFormat[]) => void;
}

export function NetworkFormatSelector({ selectedFormats, onFormatsChange }: NetworkFormatSelectorProps) {
  const [expandedPlatform, setExpandedPlatform] = useState<SocialNetwork | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get enabled networks with formats
  const enabledNetworks = (Object.keys(PLATFORM_CONFIGS) as SocialNetwork[])
    .filter(network => PLATFORM_CONFIGS[network].enabled && NETWORK_POST_FORMATS[network].length > 0);

  // Count selected formats per network
  const getSelectedCount = (network: SocialNetwork): number => {
    const networkFormats = NETWORK_POST_FORMATS[network];
    return networkFormats.filter(f => selectedFormats.includes(f.format)).length;
  };

  // Auto-collapse when formats are selected
  useEffect(() => {
    if (selectedFormats.length > 0 && !isCollapsed && expandedPlatform === null) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedFormats.length, expandedPlatform]);

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

  // Expand the card
  const expandCard = () => {
    setIsCollapsed(false);
  };

  return (
    <Card className="overflow-hidden border-0 sm:border shadow-none sm:shadow-sm max-w-full">
      <CardHeader className="pb-2 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-lg font-semibold">Selecione onde publicar</CardTitle>
          {isCollapsed && selectedFormats.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={expandCard}
              className="h-7 gap-1 text-xs text-muted-foreground"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-6 pb-4 sm:pb-6">
        {/* Collapsed state */}
        {isCollapsed && selectedFormats.length > 0 ? (
          <CollapsedFormatsSummary
            selectedFormats={selectedFormats}
            onExpand={expandCard}
            onRemove={removeFormat}
          />
        ) : (
          <>
            {/* Quick Presets */}
            <QuickPresets
              selectedFormats={selectedFormats}
              onSelectPreset={handlePresetSelect}
            />

            {/* Platform Chips - Horizontal scroll on mobile */}
            <div 
              className="platform-chips -mx-3 sm:mx-0"
              role="tablist"
              aria-label="Plataformas disponíveis"
            >
              <div className="flex gap-2 overflow-x-auto px-3 pb-2 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-hide">
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
