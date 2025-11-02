import { useState } from 'react';
import { useMilestones } from '@/hooks/useMilestones';
import { Button } from '@/components/ui/button';
import { Plus, Target } from 'lucide-react';
import { MilestoneCard } from './MilestoneCard';
import { CreateMilestoneModal } from './CreateMilestoneModal';
import { MilestoneTimeline } from './MilestoneTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Milestone } from '@/hooks/useMilestones';
import { Card } from '@/components/ui/card';

interface MilestonesListProps {
  projectId: string;
}

export function MilestonesList({ projectId }: MilestonesListProps) {
  const { milestones, createMilestone, updateMilestone, deleteMilestone, taskMilestones } = useMilestones(projectId);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null);

  // Count tasks per milestone
  const taskCounts = taskMilestones.reduce((acc, tm) => {
    acc[tm.milestone_id] = (acc[tm.milestone_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleDelete = (milestoneId: string) => {
    setMilestoneToDelete(milestoneId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (milestoneToDelete) {
      deleteMilestone.mutate(milestoneToDelete);
      setDeleteDialogOpen(false);
      setMilestoneToDelete(null);
    }
  };

  if (milestones.length === 0) {
    return (
      <>
        <Card className="p-12">
          <div className="text-center">
            <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Nenhum marco criado</h3>
            <p className="text-muted-foreground mb-6">
              Crie marcos para definir objetivos e acompanhar o progresso do projeto
            </p>
            <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Marco
            </Button>
          </div>
        </Card>

        <CreateMilestoneModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          projectId={projectId}
          onCreate={(milestone) => createMilestone.mutate(milestone)}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Marcos do Projeto</h2>
            <p className="text-muted-foreground">Defina e acompanhe marcos importantes</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Marco
          </Button>
        </div>

        <Tabs defaultValue="grid" className="space-y-6">
          <TabsList>
            <TabsTrigger value="grid">Grelha</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {milestones.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  taskCount={taskCounts[milestone.id] || 0}
                  onEdit={() => setEditingMilestone(milestone)}
                  onDelete={() => handleDelete(milestone.id)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <MilestoneTimeline milestones={milestones} taskCounts={taskCounts} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateMilestoneModal
        open={createModalOpen || !!editingMilestone}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setEditingMilestone(undefined);
        }}
        projectId={projectId}
        milestone={editingMilestone}
        onCreate={(milestone) => createMilestone.mutate(milestone)}
        onUpdate={(milestone) => updateMilestone.mutate(milestone)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Marco?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O marco será permanentemente eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
