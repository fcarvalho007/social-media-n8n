import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FolderOpen } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectModal } from '@/components/projects/CreateProjectModal';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Projects() {
  const { projects, isLoading, createProject } = useProjects();
  const { tasks } = useTasks();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter((task) => task.project_id === projectId);
    const completedTasks = projectTasks.filter((task) => task.status === 'done').length;
    const totalTasks = projectTasks.length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const uniqueAssignees = new Set(projectTasks.map((task) => task.assignee_id).filter(Boolean));
    
    return {
      completionPercentage,
      totalTasks,
      totalMembers: uniqueAssignees.size + 1,
    };
  };

  const calculateDaysRemaining = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader />
            <main className="flex-1 p-4 md:p-6">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-10 w-40" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Skip to main content for accessibility */}
        <a href="#main-content" className="skip-to-content">
          Ir para o conteúdo principal
        </a>
        
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader />
          <main id="main-content" className="flex-1 p-4 md:p-6 space-y-6 animate-fade-in">
            <div className="space-y-8">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold">Projetos</h1>
                  <p className="text-muted-foreground">Gere os teus projetos e tarefas</p>
                </div>
                <Button onClick={() => setCreateModalOpen(true)} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Criar Projeto
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder="Pesquisar projetos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    aria-label="Campo de pesquisa de projetos"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48" aria-label="Filtrar por estado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="on_hold">Em Pausa</SelectItem>
                    <SelectItem value="completed">Concluídos</SelectItem>
                    <SelectItem value="archived">Arquivados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Projects Grid */}
              {filteredProjects.length === 0 ? (
                <div className="text-center py-16" role="status" aria-live="polite">
                  <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
                  <h3 className="text-xl font-semibold mb-2">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'Nenhum projeto encontrado'
                      : 'Ainda não tens projetos'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Tenta ajustar os filtros'
                      : 'Cria o teu primeiro projeto para começar'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && (
                    <Button onClick={() => setCreateModalOpen(true)} size="lg">
                      Criar Primeiro Projeto
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((project) => {
                    const stats = getProjectStats(project.id);
                    const daysRemaining = calculateDaysRemaining(project.due_date);
                    
                    return (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        completionPercentage={stats.completionPercentage}
                        totalTasks={stats.totalTasks}
                        totalMembers={stats.totalMembers}
                        daysRemaining={daysRemaining}
                      />
                    );
                  })}
                </div>
              )}

              <CreateProjectModal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
              />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
