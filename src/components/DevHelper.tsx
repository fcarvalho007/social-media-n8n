import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { addMockProfiles, addMockMedia } from '@/lib/mockData';
import { toast } from 'sonner';
import { Wrench } from 'lucide-react';

export function DevHelper() {
  const [adding, setAdding] = useState(false);

  const handleAddMockData = async () => {
    try {
      setAdding(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Tem de iniciar sessão');
        return;
      }

      await addMockProfiles(supabase, user.id);
      await addMockMedia(supabase, user.id);
      
      toast.success('Dados de teste adicionados com sucesso!');
    } catch (error) {
      console.error('Error adding mock data:', error);
      toast.error('Falha ao adicionar dados de teste');
    } finally {
      setAdding(false);
    }
  };

  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        size="sm"
        variant="outline"
        onClick={handleAddMockData}
        disabled={adding}
        className="gap-2 shadow-lg"
      >
        <Wrench className="h-4 w-4" />
        Add Mock Data
      </Button>
    </div>
  );
}
