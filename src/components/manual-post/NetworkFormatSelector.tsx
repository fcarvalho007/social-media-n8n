import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Instagram, 
  Linkedin, 
  Youtube, 
  Facebook,
  Music,
  ChevronDown,
  LayoutGrid,
  Image,
  Circle,
  Video,
  FileText,
  File,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialNetwork, PostFormat, NETWORK_POST_FORMATS, PostFormatConfig } from '@/types/social';

interface NetworkFormatSelectorProps {
  selectedFormats: PostFormat[];
  onFormatsChange: (formats: PostFormat[]) => void;
}

const NETWORK_CONFIG: Record<SocialNetwork, { 
  name: string; 
  icon: typeof Instagram; 
  color: string;
  bgColor: string;
  enabled: boolean;
}> = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    enabled: true,
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-600/10',
    enabled: true,
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    enabled: true,
  },
  tiktok: {
    name: 'TikTok',
    icon: Music,
    color: 'text-black dark:text-white',
    bgColor: 'bg-black/10 dark:bg-white/10',
    enabled: true,
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    enabled: true,
  },
  x: {
    name: 'X',
    icon: FileText,
    color: 'text-gray-900',
    bgColor: 'bg-gray-100',
    enabled: false,
  },
};

const ICON_MAP: Record<string, typeof Instagram> = {
  LayoutGrid,
  Image,
  Circle,
  Video,
  FileText,
  File,
  Play,
};

export function NetworkFormatSelector({ selectedFormats, onFormatsChange }: NetworkFormatSelectorProps) {
  const [openNetworks, setOpenNetworks] = useState<SocialNetwork[]>(['instagram', 'linkedin']);

  const toggleNetwork = (network: SocialNetwork) => {
    setOpenNetworks(prev => 
      prev.includes(network) 
        ? prev.filter(n => n !== network)
        : [...prev, network]
    );
  };

  const isNetworkSelected = (network: SocialNetwork) => {
    const networkFormats = NETWORK_POST_FORMATS[network];
    return networkFormats.some(f => selectedFormats.includes(f.format));
  };

  const toggleFormat = (format: PostFormat) => {
    onFormatsChange(
      selectedFormats.includes(format)
        ? selectedFormats.filter(f => f !== format)
        : [...selectedFormats, format]
    );
  };

  const toggleAllNetworkFormats = (network: SocialNetwork, checked: boolean) => {
    const networkFormats = NETWORK_POST_FORMATS[network].map(f => f.format);
    
    if (checked) {
      // Add all formats from this network that aren't already selected
      const newFormats = [...selectedFormats];
      networkFormats.forEach(format => {
        if (!newFormats.includes(format)) {
          newFormats.push(format);
        }
      });
      onFormatsChange(newFormats);
    } else {
      // Remove all formats from this network
      onFormatsChange(selectedFormats.filter(f => !networkFormats.includes(f)));
    }
    
    // Ensure network is expanded when selected
    if (checked && !openNetworks.includes(network)) {
      setOpenNetworks(prev => [...prev, network]);
    }
  };

  const getFormatIcon = (iconName: string) => {
    return ICON_MAP[iconName] || FileText;
  };

  const renderFormatItem = (formatConfig: PostFormatConfig) => {
    const Icon = getFormatIcon(formatConfig.icon);
    const isSelected = selectedFormats.includes(formatConfig.format);

    return (
      <div
        key={formatConfig.format}
        onClick={() => toggleFormat(formatConfig.format)}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border",
          isSelected 
            ? "border-primary bg-primary/5" 
            : "border-transparent hover:bg-accent/50"
        )}
      >
        <Checkbox 
          checked={isSelected}
          onCheckedChange={() => toggleFormat(formatConfig.format)}
          onClick={(e) => e.stopPropagation()}
        />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">{formatConfig.label}</p>
          <p className="text-xs text-muted-foreground">{formatConfig.description}</p>
        </div>
        {formatConfig.requiresVideo && (
          <Badge variant="outline" className="text-xs">Vídeo</Badge>
        )}
      </div>
    );
  };

  const enabledNetworks = (Object.keys(NETWORK_CONFIG) as SocialNetwork[])
    .filter(network => NETWORK_CONFIG[network].enabled && NETWORK_POST_FORMATS[network].length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Selecione onde pretende publicar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {enabledNetworks.map(network => {
          const config = NETWORK_CONFIG[network];
          const formats = NETWORK_POST_FORMATS[network];
          const Icon = config.icon;
          const isOpen = openNetworks.includes(network);
          const networkSelected = isNetworkSelected(network);
          const selectedCount = formats.filter(f => selectedFormats.includes(f.format)).length;

          return (
            <Collapsible
              key={network}
              open={isOpen}
              onOpenChange={() => toggleNetwork(network)}
            >
              <div className={cn(
                "rounded-lg border transition-all",
                networkSelected ? "border-primary/50 bg-primary/5" : "border-border"
              )}>
                <div className="flex items-center gap-3 p-3">
                  <Checkbox
                    checked={networkSelected}
                    onCheckedChange={(checked) => toggleAllNetworkFormats(network, !!checked)}
                  />
                  <div className={cn("p-2 rounded-lg", config.bgColor)}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{config.name}</p>
                    {selectedCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedCount} formato{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <CollapsibleTrigger asChild>
                    <button className="p-1 hover:bg-accent rounded">
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        isOpen && "rotate-180"
                      )} />
                    </button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-1 space-y-1 border-t border-border/50 mt-1">
                    {formats.map(renderFormatItem)}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {selectedFormats.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground mb-2">Formatos selecionados:</p>
            <div className="flex flex-wrap gap-2">
              {selectedFormats.map(format => {
                const network = format.split('_')[0] as SocialNetwork;
                const formatConfig = NETWORK_POST_FORMATS[network]?.find(f => f.format === format);
                if (!formatConfig) return null;
                
                return (
                  <Badge 
                    key={format}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/10"
                    onClick={() => toggleFormat(format)}
                  >
                    {formatConfig.label}
                    <span className="ml-1 text-muted-foreground">×</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
