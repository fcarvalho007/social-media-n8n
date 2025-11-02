import { useState } from 'react';
import { useTemplates, ProjectTemplate } from '@/hooks/useTemplates';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TemplateSelectorProps {
  onSelect: (template: ProjectTemplate | null) => void;
  selectedTemplate: ProjectTemplate | null;
}

export const TemplateSelector = ({ onSelect, selectedTemplate }: TemplateSelectorProps) => {
  const { templates, isLoading } = useTemplates();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Template (opcional)</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Ocultar
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Ver templates ({templates.length})
            </>
          )}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          <Card
            className={`cursor-pointer transition-colors ${
              !selectedTemplate ? 'border-primary' : 'hover:border-primary/50'
            }`}
            onClick={() => onSelect(null)}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Projeto em branco</span>
              </div>
            </CardContent>
          </Card>

          {templates.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-colors ${
                selectedTemplate?.id === template.id
                  ? 'border-primary'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onSelect(template)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="text-xs mt-1">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                  {template.is_public && (
                    <Badge variant="secondary" className="ml-2">
                      Público
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{template.structure.tasks.length} tarefas</span>
                  <span>{template.structure.milestones.length} marcos</span>
                  <span>{template.structure.dependencies.length} deps</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedTemplate && !expanded && (
        <Card className="border-primary">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{selectedTemplate.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedTemplate.structure.tasks.length} tarefas •{' '}
                  {selectedTemplate.structure.milestones.length} marcos
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelect(null)}
              >
                Remover
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
