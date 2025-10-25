import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Instagram, Linkedin, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { PublishTarget, PLATFORM_CONSTRAINTS } from '@/types/publishing';
import { cn } from '@/lib/utils';

interface TargetSelectorProps {
  selectedTargets: Record<PublishTarget, boolean>;
  onTargetsChange: (targets: Record<PublishTarget, boolean>) => void;
  validations?: Record<PublishTarget, { valid: boolean; errors: string[]; warnings: string[] }>;
}

export function TargetSelector({ selectedTargets, onTargetsChange, validations }: TargetSelectorProps) {
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
        <Badge variant="destructive" className="gap-1 ml-2 text-xs">
          <AlertCircle className="h-3 w-3" />
          Erro
        </Badge>
      );
    }
    if (validation.warnings.length > 0) {
      return (
        <Badge variant="outline" className="gap-1 ml-2 text-xs border-yellow-500/50 bg-yellow-500/10 text-yellow-600">
          <AlertCircle className="h-3 w-3" />
          Aviso
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 ml-2 text-xs border-green-500/50 bg-green-500/10 text-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Válido
      </Badge>
    );
  };

  const getValidationMessages = (platform: PublishTarget) => {
    if (!selectedTargets[platform]) return null;
    
    const validation = validations?.[platform];
    if (!validation) return null;

    return (
      <div className="mt-2 space-y-1">
        {validation.errors.map((error, i) => (
          <p key={`error-${i}`} className="text-xs text-destructive flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            {error}
          </p>
        ))}
        {validation.warnings.map((warning, i) => (
          <p key={`warning-${i}`} className="text-xs text-yellow-600 flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            {warning}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg tracking-tight">Plataformas de Publicação</CardTitle>
        <CardDescription className="text-sm leading-snug">Selecione onde pretende publicar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <TooltipProvider delayDuration={200}>
            {/* Instagram */}
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleTarget('instagram')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-150 cursor-pointer h-11",
                    selectedTargets.instagram
                      ? "border-pink-600 bg-pink-600/10 text-pink-600 shadow-sm ring-1 ring-pink-600/20"
                      : "border-border bg-background hover:border-pink-600/50 hover:bg-accent/50"
                  )}
                >
                  <Instagram className="h-5 w-5" />
                  <span className="font-semibold text-sm">Instagram</span>
                  {selectedTargets.instagram && (
                    <CheckCircle2 className="h-4 w-4 ml-auto" />
                  )}
                </button>
                
                {selectedTargets.instagram && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="flex-shrink-0 h-11 w-11 rounded-xl border-2 border-border bg-background hover:bg-accent/50 transition-all duration-150 flex items-center justify-center">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top" 
                      className="max-w-[360px] p-4 rounded-2xl shadow-lg border bg-popover"
                      sideOffset={8}
                    >
                      <div className="space-y-2">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-600" />
                          Instagram · Carrossel
                        </p>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>• 2–10 imagens, 1080px mínimo, sRGB</p>
                          <p>• Recomendado: 4:5 (1080×1350) ou 9:16</p>
                          <p>• Caption ≤ {PLATFORM_CONSTRAINTS.instagram.caption.maxLength} caracteres</p>
                          <p>• Máximo {PLATFORM_CONSTRAINTS.instagram.hashtags.maxCount} hashtags</p>
                          <p>• Vídeo: 3–90s, ≤ 650MB</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {getValidationBadge('instagram')}
              {getValidationMessages('instagram')}
            </div>

            {/* LinkedIn */}
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleTarget('linkedin')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-150 cursor-pointer h-11",
                    selectedTargets.linkedin
                      ? "border-blue-600 bg-blue-600/10 text-blue-600 shadow-sm ring-1 ring-blue-600/20"
                      : "border-border bg-background hover:border-blue-600/50 hover:bg-accent/50"
                  )}
                >
                  <Linkedin className="h-5 w-5" />
                  <span className="font-semibold text-sm">LinkedIn</span>
                  {selectedTargets.linkedin && (
                    <CheckCircle2 className="h-4 w-4 ml-auto" />
                  )}
                </button>
                
                {selectedTargets.linkedin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="flex-shrink-0 h-11 w-11 rounded-xl border-2 border-border bg-background hover:bg-accent/50 transition-all duration-150 flex items-center justify-center">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top" 
                      className="max-w-[360px] p-4 rounded-2xl shadow-lg border bg-popover"
                      sideOffset={8}
                    >
                      <div className="space-y-2">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <Linkedin className="h-4 w-4 text-blue-600" />
                          LinkedIn · Carrossel → Documento (PDF)
                        </p>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>• Publicado como Documento (PDF)</p>
                          <p>• Até {PLATFORM_CONSTRAINTS.linkedin.carousel.maxImages} páginas, ≤ 100 MB</p>
                          <p>• Recomendado: 8–12 páginas</p>
                          <p>• Texto ≤ {PLATFORM_CONSTRAINTS.linkedin.body.maxLength} caracteres</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {getValidationBadge('linkedin')}
              {getValidationMessages('linkedin')}
            </div>
          </TooltipProvider>
        </div>
        
        {Object.values(selectedTargets).every(v => !v) && (
          <p className="text-sm text-muted-foreground">
            Selecionar pelo menos uma plataforma para publicar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
