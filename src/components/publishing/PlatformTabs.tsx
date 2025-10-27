import { Instagram, Linkedin, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PublishTarget, PLATFORM_CONSTRAINTS } from '@/types/publishing';
import { cn } from '@/lib/utils';

interface PlatformTabsProps {
  selectedTargets: Record<PublishTarget, boolean>;
  onTargetsChange: (targets: Record<PublishTarget, boolean>) => void;
  validations?: Record<PublishTarget, { valid: boolean; errors: string[]; warnings: string[] }>;
}

export function PlatformTabs({ selectedTargets, onTargetsChange, validations }: PlatformTabsProps) {
  const toggleTarget = (target: PublishTarget) => {
    onTargetsChange({
      ...selectedTargets,
      [target]: !selectedTargets[target],
    });
  };

  const getValidationBadge = (platform: PublishTarget) => {
    if (!selectedTargets[platform]) return null;
    
    const validation = validations?.[platform];
    if (!validation) return null;

    if (validation.errors.length > 0) {
      return (
        <Badge variant="destructive" className="gap-1 text-xs px-2 py-0.5 rounded-full">
          <AlertCircle className="h-3 w-3" />
          Erros · {validation.errors.length}
        </Badge>
      );
    }
    if (validation.warnings.length > 0) {
      return (
        <Badge variant="outline" className="gap-1 text-xs px-2 py-0.5 rounded-full border-yellow-500/50 bg-yellow-500/10 text-yellow-600">
          <AlertCircle className="h-3 w-3" />
          Avisos · {validation.warnings.length}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-xs px-2 py-0.5 rounded-full border-green-500/50 bg-green-500/10 text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Válido
      </Badge>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto snap-x snap-mandatory pb-2">
        {/* Instagram Tab */}
        <div className="flex items-center gap-2 snap-start">
          <button
            onClick={() => toggleTarget('instagram')}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 border-2 transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40",
              selectedTargets.instagram
                ? "border-pink-600/30 bg-pink-600/10 text-pink-600 ring-1 ring-pink-600/30 shadow-sm"
                : "border-border bg-card hover:border-pink-600/50 hover:bg-accent/50"
            )}
            aria-selected={selectedTargets.instagram}
            role="tab"
          >
            <Instagram className="h-4 w-4" />
            <span className="font-semibold text-sm">Instagram</span>
            {selectedTargets.instagram && (
              <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
            )}
          </button>

          {selectedTargets.instagram && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex-shrink-0 h-9 w-9 rounded-full border-2 border-border bg-card hover:bg-accent/50 transition-all duration-150 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="max-w-[320px] p-3 rounded-xl shadow-lg border bg-popover"
                sideOffset={8}
              >
                <div className="space-y-2">
                  <p className="font-semibold text-xs flex items-center gap-2">
                    <Instagram className="h-3.5 w-3.5 text-pink-600" />
                    Instagram · Carrossel
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>• Carrossel publicado como imagens nativas (2–10)</p>
                    <p>• Recomendado: 4:5 (1080×1350) ou 9:16</p>
                    <p>• Caption ≤ {PLATFORM_CONSTRAINTS.instagram.caption.maxLength} caracteres</p>
                    <p>• Máximo {PLATFORM_CONSTRAINTS.instagram.hashtags.maxCount} hashtags</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {getValidationBadge('instagram')}
        </div>

        {/* LinkedIn Tab */}
        <div className="flex items-center gap-2 snap-start">
          <button
            onClick={() => toggleTarget('linkedin')}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 border-2 transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40",
              selectedTargets.linkedin
                ? "border-blue-600/30 bg-blue-600/10 text-blue-600 ring-1 ring-blue-600/30 shadow-sm"
                : "border-border bg-card hover:border-blue-600/50 hover:bg-accent/50"
            )}
            aria-selected={selectedTargets.linkedin}
            role="tab"
          >
            <Linkedin className="h-4 w-4" />
            <span className="font-semibold text-sm">LinkedIn</span>
            {selectedTargets.linkedin && (
              <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
            )}
          </button>

          {selectedTargets.linkedin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex-shrink-0 h-9 w-9 rounded-full border-2 border-border bg-card hover:bg-accent/50 transition-all duration-150 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="max-w-[320px] p-3 rounded-xl shadow-lg border bg-popover"
                sideOffset={8}
              >
                <div className="space-y-2">
                  <p className="font-semibold text-xs flex items-center gap-2">
                    <Linkedin className="h-3.5 w-3.5 text-blue-600" />
                    LinkedIn · Carrossel → Documento (PDF)
                  </p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>• Carrossel publicado como Documento (PDF)</p>
                    <p>• Até {PLATFORM_CONSTRAINTS.linkedin.carousel.maxImages} páginas, ≤ 100 MB</p>
                    <p>• Recomendado: 8–12 páginas</p>
                    <p>• Texto ≤ {PLATFORM_CONSTRAINTS.linkedin.body.maxLength} caracteres</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {getValidationBadge('linkedin')}
        </div>
      </div>

      {Object.values(selectedTargets).every(v => !v) && (
        <p className="text-xs text-muted-foreground mt-2">
          Selecione pelo menos uma plataforma para publicar
        </p>
      )}
    </TooltipProvider>
  );
}
