import { Megaphone, Target, Star, Info } from 'lucide-react';
import { SuggestedHashtag } from '@/types/aiEditorial';
import { SocialNetwork } from '@/types/social';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const groupConfig = {
  reach: { title: 'Alcance', subtitle: 'Volume alto · Maior exposição', icon: Megaphone },
  niche: { title: 'Nicho', subtitle: 'Volume médio · Comunidade ativa', icon: Target },
  brand: { title: 'Marca', subtitle: 'As tuas fixas', icon: Star },
};

const networkLimits: Partial<Record<SocialNetwork, { max: number; recommended: number }>> = {
  instagram: { max: 30, recommended: 15 },
  tiktok: { max: 5, recommended: 5 },
  linkedin: { max: 5, recommended: 5 },
  x: { max: 2, recommended: 2 },
  facebook: { max: 3, recommended: 3 },
};

const statusClass = {
  good: 'bg-emerald-500',
  saturated: 'bg-amber-500',
  risk: 'bg-destructive',
};

interface HashtagSuggestionsProps {
  hashtags: SuggestedHashtag[];
  selectedTags: string[];
  activeNetwork: SocialNetwork;
  onToggleTag: (tag: string) => void;
}

export function HashtagSuggestions({ hashtags, selectedTags, activeNetwork, onToggleTag }: HashtagSuggestionsProps) {
  if (hashtags.length === 0) return null;
  const limit = networkLimits[activeNetwork] ?? { max: 10, recommended: 10 };

  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Hashtags sugeridas</h4>
          <p className="text-xs text-muted-foreground">{selectedTags.length}/{limit.recommended} selecionadas para {activeNetwork}</p>
        </div>
        <p className="text-xs text-muted-foreground">Scores só aparecem com dados verificados.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {(['reach', 'niche', 'brand'] as const).map((group) => {
          const config = groupConfig[group];
          const Icon = config.icon;
          const items = hashtags.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="space-y-2 rounded-md border bg-background/60 p-2">
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide">{config.title}</p>
                  <p className="text-[11px] text-muted-foreground">{config.subtitle}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item) => {
                  const selected = selectedTags.includes(item.tag);
                  const chip = (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => onToggleTag(item.tag)}
                      className={cn(
                        'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors',
                        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted',
                      )}
                    >
                      {item.status && item.source && item.verifiedAt ? <span className={cn('h-2 w-2 rounded-full', statusClass[item.status])} /> : null}
                      {item.tag}
                    </button>
                  );
                  if (!item.status || !item.source || !item.verifiedAt) return chip;
                  return (
                    <Tooltip key={item.tag}>
                      <TooltipTrigger asChild>{chip}</TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1 text-xs">
                          <p>Volume estimado: {item.volumeEstimate ?? 'não disponível'}</p>
                          <p>Fonte: {item.source}</p>
                          <p>Última verificação: {new Date(item.verifiedAt).toLocaleDateString('pt-PT')}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {selectedTags.length > limit.max && (
        <Badge variant="destructive" className="gap-1">
          <Info className="h-3 w-3" />
          Acima do limite recomendado para esta rede
        </Badge>
      )}
    </section>
  );
}
