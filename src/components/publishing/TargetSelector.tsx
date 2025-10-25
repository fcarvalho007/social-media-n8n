import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Instagram, Linkedin } from 'lucide-react';
import { PublishTarget } from '@/types/publishing';

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
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors hover:bg-accent/50">
            <Checkbox
              id="instagram"
              checked={selectedTargets.instagram}
              onCheckedChange={() => toggleTarget('instagram')}
            />
            <Label
              htmlFor="instagram"
              className="flex items-center gap-2 cursor-pointer flex-1"
            >
              <Instagram className="h-5 w-5 text-pink-600" />
              <span className="font-semibold">Instagram</span>
            </Label>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors hover:bg-accent/50">
            <Checkbox
              id="linkedin"
              checked={selectedTargets.linkedin}
              onCheckedChange={() => toggleTarget('linkedin')}
            />
            <Label
              htmlFor="linkedin"
              className="flex items-center gap-2 cursor-pointer flex-1"
            >
              <Linkedin className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">LinkedIn</span>
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
