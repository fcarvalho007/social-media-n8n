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
  Check,
  X,
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
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  enabled: boolean;
}> = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-500',
    bgColor: 'bg-gradient-to-br from-pink-500/10 to-purple-500/10',
    borderColor: 'border-pink-500/30',
    gradientFrom: 'from-pink-500',
    gradientTo: 'to-purple-500',
    enabled: true,
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-600',
    bgColor: 'bg-blue-600/5',
    borderColor: 'border-blue-600/30',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-500',
    enabled: true,
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-500',
    bgColor: 'bg-red-500/5',
    borderColor: 'border-red-500/30',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-red-600',
    enabled: true,
  },
  tiktok: {
    name: 'TikTok',
    icon: Music,
    color: 'text-foreground',
    bgColor: 'bg-foreground/5',
    borderColor: 'border-foreground/30',
    gradientFrom: 'from-cyan-400',
    gradientTo: 'to-pink-500',
    enabled: true,
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/5',
    borderColor: 'border-blue-500/30',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-blue-600',
    enabled: true,
  },
  x: {
    name: 'X',
    icon: FileText,
    color: 'text-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
    gradientFrom: 'from-gray-900',
    gradientTo: 'to-gray-800',
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
      const newFormats = [...selectedFormats];
      networkFormats.forEach(format => {
        if (!newFormats.includes(format)) {
          newFormats.push(format);
        }
      });
      onFormatsChange(newFormats);
    } else {
      onFormatsChange(selectedFormats.filter(f => !networkFormats.includes(f)));
    }
    
    if (checked && !openNetworks.includes(network)) {
      setOpenNetworks(prev => [...prev, network]);
    }
  };

  const getFormatIcon = (iconName: string) => {
    return ICON_MAP[iconName] || FileText;
  };

  const getSelectedCountForNetwork = (network: SocialNetwork) => {
    const formats = NETWORK_POST_FORMATS[network];
    return formats.filter(f => selectedFormats.includes(f.format)).length;
  };

  const renderFormatItem = (formatConfig: PostFormatConfig, network: SocialNetwork) => {
    const Icon = getFormatIcon(formatConfig.icon);
    const isSelected = selectedFormats.includes(formatConfig.format);
    const config = NETWORK_CONFIG[network];
    
    const hasVideoFormats = selectedFormats.some(f => 
      f === 'instagram_carousel' || f === 'instagram_reel' || f.includes('video') || 
      f.includes('reel') || f.includes('shorts')
    );
    const showVideoWarning = isSelected && formatConfig.format === 'linkedin_document' && hasVideoFormats;

    return (
      <div
        key={formatConfig.format}
        onClick={() => toggleFormat(formatConfig.format)}
        className={cn(
          "group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
          "border-2",
          isSelected 
            ? cn("border-primary/50 bg-primary/5 shadow-sm", config.bgColor)
            : "border-transparent hover:border-border hover:bg-accent/30 hover:shadow-sm"
        )}
      >
        {/* Custom Checkbox */}
        <div className={cn(
          "flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
          isSelected 
            ? "bg-primary border-primary" 
            : "border-muted-foreground/30 group-hover:border-muted-foreground/50"
        )}>
          {isSelected && (
            <Check className="h-3 w-3 text-primary-foreground animate-scale-in" />
          )}
        </div>
        
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 p-2 rounded-lg transition-colors",
          isSelected ? config.bgColor : "bg-muted/50"
        )}>
          <Icon className={cn("h-4 w-4", isSelected ? config.color : "text-muted-foreground")} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-sm font-semibold transition-colors",
              isSelected ? "text-foreground" : "text-foreground/80"
            )}>
              {formatConfig.label}
            </p>
            {formatConfig.requiresVideo && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Vídeo</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{formatConfig.description}</p>
          
          {showVideoWarning && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-500" />
              Frame extraído automaticamente para gerar PDF
            </p>
          )}
        </div>
      </div>
    );
  };

  const enabledNetworks = (Object.keys(NETWORK_CONFIG) as SocialNetwork[])
    .filter(network => NETWORK_CONFIG[network].enabled && NETWORK_POST_FORMATS[network].length > 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Selecione onde pretende publicar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Network Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {enabledNetworks.map(network => {
            const config = NETWORK_CONFIG[network];
            const formats = NETWORK_POST_FORMATS[network];
            const Icon = config.icon;
            const isOpen = openNetworks.includes(network);
            const networkSelected = isNetworkSelected(network);
            const selectedCount = getSelectedCountForNetwork(network);

            return (
              <Collapsible
                key={network}
                open={isOpen}
                onOpenChange={() => toggleNetwork(network)}
                className="col-span-1 sm:col-span-2 lg:col-span-1"
              >
                <div className={cn(
                  "rounded-xl border-2 transition-all duration-200 overflow-hidden",
                  isOpen && networkSelected && config.bgColor,
                  networkSelected ? config.borderColor : "border-border",
                  !networkSelected && !isOpen && "hover:border-muted-foreground/30"
                )}>
                  {/* Network Header */}
                  <div className="flex items-center gap-3 p-3">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllNetworkFormats(network, !networkSelected);
                      }}
                      className={cn(
                        "flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all",
                        networkSelected 
                          ? "bg-primary border-primary" 
                          : "border-muted-foreground/30 hover:border-muted-foreground/50"
                      )}
                    >
                      {networkSelected && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    
                    <div className={cn(
                      "p-2.5 rounded-xl transition-all",
                      networkSelected 
                        ? cn("bg-gradient-to-br", config.gradientFrom, config.gradientTo)
                        : config.bgColor
                    )}>
                      <Icon className={cn(
                        "h-5 w-5 transition-colors",
                        networkSelected ? "text-white" : config.color
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{config.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedCount > 0 
                          ? `${selectedCount} formato${selectedCount !== 1 ? 's' : ''} selecionado${selectedCount !== 1 ? 's' : ''}`
                          : `${formats.length} formato${formats.length !== 1 ? 's' : ''} disponível${formats.length !== 1 ? 'is' : ''}`
                        }
                      </p>
                    </div>
                    
                    <CollapsibleTrigger asChild>
                      <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isOpen && "rotate-180"
                        )} />
                      </button>
                    </CollapsibleTrigger>
                  </div>

                  {/* Format Items */}
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/50 mt-1">
                      {formats.map(format => renderFormatItem(format, network))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Selected Formats Tags */}
        {selectedFormats.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Formatos selecionados:</p>
            <div className="flex flex-wrap gap-2">
              {selectedFormats.map(format => {
                const network = format.split('_')[0] as SocialNetwork;
                const formatConfig = NETWORK_POST_FORMATS[network]?.find(f => f.format === format);
                const networkConfig = NETWORK_CONFIG[network];
                if (!formatConfig || !networkConfig) return null;
                
                const NetworkIcon = networkConfig.icon;
                
                return (
                  <Badge 
                    key={format}
                    variant="secondary"
                    className={cn(
                      "group cursor-pointer pr-1.5 transition-all hover:bg-destructive/10 hover:border-destructive/30",
                      "flex items-center gap-1.5"
                    )}
                    onClick={() => toggleFormat(format)}
                  >
                    <NetworkIcon className={cn("h-3 w-3", networkConfig.color)} />
                    <span>{formatConfig.label}</span>
                    <X className="h-3 w-3 text-muted-foreground group-hover:text-destructive transition-colors" />
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
