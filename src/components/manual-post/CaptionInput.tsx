import { useState, useEffect } from 'react';
import { SocialNetwork } from '@/types/social';
import { NETWORK_CONSTRAINTS, NETWORK_INFO, getCharacterCount } from '@/lib/socialNetworks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaptionInputProps {
  caption: string;
  onCaptionChange: (caption: string) => void;
  selectedNetworks: SocialNetwork[];
}

export function CaptionInput({ caption, onCaptionChange, selectedNetworks }: CaptionInputProps) {
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const newWarnings: string[] = [];
    const hashtagCount = (caption.match(/#/g) || []).length;
    
    if (hashtagCount > 30) {
      newWarnings.push('Hashtags excessivas podem reduzir o engagement');
    }

    // Check for duplicate lines
    const lines = caption.split('\n').filter(l => l.trim());
    const uniqueLines = new Set(lines);
    if (lines.length !== uniqueLines.size) {
      newWarnings.push('Texto duplicado detetado');
    }

    setWarnings(newWarnings);
  }, [caption]);

  const getNetworkStatus = (network: SocialNetwork) => {
    const constraints = NETWORK_CONSTRAINTS[network];
    const count = getCharacterCount(caption, network);
    const max = constraints.max_caption_length;
    const percentage = (count / max) * 100;

    return {
      count,
      max,
      percentage,
      isOverLimit: count > max,
      isNearLimit: percentage > 90 && count <= max,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Legenda</CardTitle>
        <CardDescription>Escreva a legenda da sua publicação</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Escreva a sua legenda aqui..."
          className="min-h-[120px] resize-none"
        />

        {/* Character counters by network */}
        {selectedNetworks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedNetworks.map(network => {
              const status = getNetworkStatus(network);
              const networkInfo = NETWORK_INFO[network];

              return (
                <Badge
                  key={network}
                  variant={status.isOverLimit ? 'destructive' : 'secondary'}
                  className={cn(
                    'text-xs font-semibold',
                    status.isNearLimit && !status.isOverLimit && 'bg-warning text-warning-foreground'
                  )}
                >
                  <networkInfo.icon className="h-3 w-3 mr-1" />
                  {status.count}/{status.max}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-warning">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
