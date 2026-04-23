import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const useProfiles = () => {
  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .order('full_name');

      if (error) throw error;
      return data as Profile[];
    },
  });

  return { profiles, isLoading, refetch };
};
