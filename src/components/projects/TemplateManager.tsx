import { useState } from 'react';
import { useTemplates, ProjectTemplate } from '@/hooks/useTemplates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Trash2, Eye, Globe, Lock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const TemplateManager = () => {
  const { templates, isLoading, deleteTemplate } = useTemplates();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewTemplate, setViewTemplate] = useState<ProjectTemplate | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum template criado ainda</p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant={template.is_public ? 'default' : 'secondary'}>
                        {template.is_public ? (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            Público
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            Privado
                          </>
                        )}
                      </Badge>
                    </div>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewTemplate(template)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{template.structure.tasks.length} tarefas</span>
                  <span>{template.structure.milestones.length} marcos</span>
                  <span>{template.structure.dependencies.length} dependências</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteTemplate.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!viewTemplate} onOpenChange={() => setViewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {viewTemplate && (
            <div className="space-y-4">
              {viewTemplate.description && (
                <p className="text-sm text-muted-foreground">{viewTemplate.description}</p>
              )}
              
              <div>
                <h3 className="font-semibold mb-2">Tarefas ({viewTemplate.structure.tasks.length})</h3>
                <div className="space-y-2">
                  {viewTemplate.structure.tasks.map((task, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{task.title}</span>
                        <Badge variant="outline">{task.priority}</Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Início: dia +{task.relativeStart} • Duração: {task.relativeDuration} dias
                        {task.estimated_hours && ` • ${task.estimated_hours}h estimadas`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {viewTemplate.structure.milestones.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Marcos ({viewTemplate.structure.milestones.length})</h3>
                  <div className="space-y-2">
                    {viewTemplate.structure.milestones.map((milestone, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <span className="font-medium">{milestone.title}</span>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          Data: dia +{milestone.relativeDueDate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewTemplate.structure.dependencies.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Dependências ({viewTemplate.structure.dependencies.length})</h3>
                  <div className="space-y-1 text-sm">
                    {viewTemplate.structure.dependencies.map((dep, idx) => (
                      <div key={idx} className="text-muted-foreground">
                        Tarefa {dep.taskIndex + 1} depende da Tarefa {dep.dependsOnTaskIndex + 1} ({dep.type})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
