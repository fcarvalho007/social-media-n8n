import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateManager } from '@/components/projects/TemplateManager';
import { FileText } from 'lucide-react';

export default function Templates() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6" />
                    <div>
                      <CardTitle>Templates de Projetos</CardTitle>
                      <CardDescription>
                        Crie templates reutilizáveis a partir dos seus projetos
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TemplateManager />
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
