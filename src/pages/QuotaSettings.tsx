import { AppSidebar } from '@/components/AppSidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { QuotaManagement } from '@/components/QuotaManagement';
import { usePublishingQuota } from '@/hooks/usePublishingQuota';
import { RefreshCw } from 'lucide-react';

export default function QuotaSettings() {
  const { refetch } = usePublishingQuota();

  const handleQuotaChange = () => {
    refetch();
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="flex-1">
        <DashboardHeader />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto bg-gradient-to-br from-white to-gray-50">
          <div className="animate-slide-up space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-primary" />
                  </div>
                  Configurações de Quota
                </h1>
                <p className="text-muted-foreground mt-2 ml-[60px]">
                  Gerencie manualmente a quota de publicações das suas plataformas
                </p>
              </div>
            </div>

            {/* Quota Management Component */}
            <QuotaManagement onQuotaChange={handleQuotaChange} />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}