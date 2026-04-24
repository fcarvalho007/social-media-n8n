import { Megaphone, Target, Star, Info } from 'lucide-react';
import { SuggestedHashtag } from '@/types/aiEditorial';
import { SocialNetwork } from '@/types/social';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { NETWORK_HASHTAG_LIMITS } from '@/lib/hashtags/safety';

const groupConfig = {
  reach: { title: 'Alcance', subtitle: 'Temas amplos e fáceis de descobrir', icon: Megaphone },
  niche: { title: 'Nicho', subtitle: 'Contexto específico do conteúdo', icon: Target },
  brand: { title: 'Marca', subtitle: 'Hashtags definidas nas preferências', icon: Star },
};

const statusClass = {
  neutral: 'bg-muted-foreground',
  risk: 'bg-destructive',
  banned: 'bg-destructive',
  over_limit: 'bg-destructive',
};

interface HashtagSuggestionsProps {
  hashtags: SuggestedHashtag[];
  selectedTags: string[];
  activeNetwork: SocialNetwork;
  onToggleTag: (tag: string) => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

export function HashtagSuggestions({ hashtags, selectedTags, activeNetwork, onToggleTag, onRegenerate, regenerating }: HashtagSuggestionsProps) {
  if (hashtags.length === 0) return null;
  const limit = NETWORK_HASHTAG_LIMITS[activeNetwork as keyof typeof NETWORK_HASHTAG_LIMITS] ?? { max: 10, recommended: 10 };

  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Hashtags sugeridas</h4>
          <p className="text-xs text-muted-foreground">{selectedTags.length}/{limit.recommended} selecionadas para {activeNetwork}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Sem volume nem desempenho de mercado.</p>
          {onRegenerate && <Button type="button" variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating}>{regenerating ? 'A gerar...' : 'Regenerar · 1 crédito'}</Button>}
        </div>
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
                      {item.status && item.status !== 'neutral' ? <span className={cn('h-2 w-2 rounded-full', statusClass[item.status])} /> : null}
                      {item.tag}
                    </button>
                  );
                  if (!item.status || item.status === 'neutral') return chip;
                  return (
                    <Tooltip key={item.tag}>
                      <TooltipTrigger asChild>{chip}</TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1 text-xs">
                          <p>{item.riskReason || item.reason || 'Rever antes de publicar.'}</p>
                          {item.source && <p>Fonte: {item.source}</p>}
                          {item.verifiedAt && <p>Última verificação: {new Date(item.verifiedAt).toLocaleDateString('pt-PT')}</p>}
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
