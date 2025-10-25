import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Instagram, Linkedin, CheckCircle2 } from 'lucide-react';
import { PublishTarget } from '@/types/publishing';
import { cn } from '@/lib/utils';

interface TargetSelectorProps {
  selectedTargets: Record<PublishTarget, boolean>;
  onTargetsChange: (targets: Record<PublishTarget, boolean>) => void;
}

export function TargetSelector({ selectedTargets, onTargetsChange }: TargetSelectorProps) {
  const toggleTarget = (target: PublishTarget) => {
    onTargetsChange({
      ...selectedTargets,
      [target]: !selectedTargets[target],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plataformas de Publicação</CardTitle>
        <CardDescription>Selecione onde pretende publicar</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => toggleTarget('instagram')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer",
              selectedTargets.instagram
                ? "border-pink-600 bg-pink-600/10 text-pink-600 shadow-lg"
                : "border-border bg-background hover:border-pink-600/50 hover:bg-accent/50"
            )}
          >
            <Instagram className="h-5 w-5" />
            <span className="font-semibold">Instagram</span>
            {selectedTargets.instagram && (
              <CheckCircle2 className="h-4 w-4 ml-1" />
            )}
          </button>

          <button
            onClick={() => toggleTarget('linkedin')}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all cursor-pointer",
              selectedTargets.linkedin
                ? "border-blue-600 bg-blue-600/10 text-blue-600 shadow-lg"
                : "border-border bg-background hover:border-blue-600/50 hover:bg-accent/50"
            )}
          >
            <Linkedin className="h-5 w-5" />
            <span className="font-semibold">LinkedIn</span>
            {selectedTargets.linkedin && (
              <CheckCircle2 className="h-4 w-4 ml-1" />
            )}
          </button>
        </div>
        
        {Object.values(selectedTargets).every(v => !v) && (
          <p className="text-sm text-muted-foreground mt-3">
            Selecione pelo menos uma plataforma para publicar
          </p>
        )}
      </CardContent>
    </Card>
  );
}
