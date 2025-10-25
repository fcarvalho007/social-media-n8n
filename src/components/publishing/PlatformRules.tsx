import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Instagram, Linkedin, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PublishTarget, PLATFORM_CONSTRAINTS, PostType } from '@/types/publishing';
import { useState } from 'react';

interface PlatformRulesProps {
  selectedTargets: Record<PublishTarget, boolean>;
  postType: PostType;
  validations?: Record<PublishTarget, { valid: boolean; errors: string[]; warnings: string[] }>;
}

export function PlatformRules({ selectedTargets, postType, validations }: PlatformRulesProps) {
  const [instagramOpen, setInstagramOpen] = useState(true);
  const [linkedinOpen, setLinkedinOpen] = useState(true);

  const activeTargets = Object.entries(selectedTargets)
    .filter(([_, active]) => active)
    .map(([target]) => target as PublishTarget);

  if (activeTargets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Regras das Plataformas</CardTitle>
          <CardDescription>Selecione plataformas para ver as regras</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getValidationStatus = (platform: PublishTarget) => {
    const validation = validations?.[platform];
    if (!validation) return null;

    if (validation.errors.length > 0) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Erros</Badge>;
    }
    if (validation.warnings.length > 0) {
      return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" />Avisos</Badge>;
    }
    return <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3" />Válido</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras das Plataformas</CardTitle>
        <CardDescription>Requisitos para {postType.replace('_', ' ')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {selectedTargets.instagram && (
          <Collapsible open={instagramOpen} onOpenChange={setInstagramOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-600" />
                <span className="font-semibold">Instagram</span>
              </div>
              <div className="flex items-center gap-2">
                {getValidationStatus('instagram')}
                <ChevronDown className={`h-4 w-4 transition-transform ${instagramOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pl-3 space-y-2 text-sm">
              <div>
                <p className="font-medium">Caption</p>
                <p className="text-muted-foreground">Máximo {PLATFORM_CONSTRAINTS.instagram.caption.maxLength} caracteres</p>
                <p className="text-muted-foreground">Máximo {PLATFORM_CONSTRAINTS.instagram.hashtags.maxCount} hashtags</p>
              </div>
              {postType === 'carousel' && (
                <div>
                  <p className="font-medium">Carrossel → PDF</p>
                  <p className="text-muted-foreground">{PLATFORM_CONSTRAINTS.instagram.carousel.minImages}-{PLATFORM_CONSTRAINTS.instagram.carousel.maxImages} imagens</p>
                  <p className="text-muted-foreground">Exportado como PDF ordenado</p>
                </div>
              )}
              {postType === 'video' && (
                <div>
                  <p className="font-medium">Vídeo</p>
                  <p className="text-muted-foreground">{PLATFORM_CONSTRAINTS.instagram.video.minDuration}-{PLATFORM_CONSTRAINTS.instagram.video.maxDuration}s duração</p>
                  <p className="text-muted-foreground">Máximo {PLATFORM_CONSTRAINTS.instagram.video.maxSizeMB}MB</p>
                </div>
              )}
              {validations?.instagram && (
                <div className="space-y-1 mt-2">
                  {validations.instagram.errors.map((error, i) => (
                    <p key={i} className="text-destructive text-xs flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {error}
                    </p>
                  ))}
                  {validations.instagram.warnings.map((warning, i) => (
                    <p key={i} className="text-muted-foreground text-xs flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {warning}
                    </p>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {selectedTargets.linkedin && (
          <Collapsible open={linkedinOpen} onOpenChange={setLinkedinOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2">
                <Linkedin className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">LinkedIn</span>
              </div>
              <div className="flex items-center gap-2">
                {getValidationStatus('linkedin')}
                <ChevronDown className={`h-4 w-4 transition-transform ${linkedinOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pl-3 space-y-2 text-sm">
              <div>
                <p className="font-medium">Texto</p>
                <p className="text-muted-foreground">Máximo {PLATFORM_CONSTRAINTS.linkedin.body.maxLength} caracteres</p>
                <p className="text-muted-foreground">Recomendado {PLATFORM_CONSTRAINTS.linkedin.hashtags.recommendedCount} hashtags</p>
              </div>
              {postType === 'carousel' && (
                <div>
                  <p className="font-medium">Carrossel → Documento PDF</p>
                  <p className="text-muted-foreground">{PLATFORM_CONSTRAINTS.linkedin.carousel.minImages}-{PLATFORM_CONSTRAINTS.linkedin.carousel.maxImages} páginas</p>
                  <p className="text-muted-foreground">Publicado como Documento</p>
                </div>
              )}
              {postType === 'video' && (
                <div>
                  <p className="font-medium">Vídeo</p>
                  <p className="text-muted-foreground">Máximo {PLATFORM_CONSTRAINTS.linkedin.video.maxDurationMin} minutos</p>
                </div>
              )}
              {validations?.linkedin && (
                <div className="space-y-1 mt-2">
                  {validations.linkedin.errors.map((error, i) => (
                    <p key={i} className="text-destructive text-xs flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {error}
                    </p>
                  ))}
                  {validations.linkedin.warnings.map((warning, i) => (
                    <p key={i} className="text-muted-foreground text-xs flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {warning}
                    </p>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
