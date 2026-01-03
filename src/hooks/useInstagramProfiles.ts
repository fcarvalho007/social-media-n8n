import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface InstagramProfile {
  id: string;
  user_id: string;
  instagram_id: string;
  username: string;
  full_name: string | null;
  biography: string | null;
  followers_count: number;
  follows_count: number;
  posts_count: number;
  is_verified: boolean;
  is_business_account: boolean;
  business_category: string | null;
  profile_pic_url: string | null;
  profile_pic_url_hd: string | null;
  external_url: string | null;
  external_urls: any[];
  highlight_reel_count: number;
  is_private: boolean;
  scraped_at: string;
  scraped_date: string;
  created_at: string;
}

interface UseInstagramProfilesOptions {
  publicMode?: boolean;
}

export function useInstagramProfiles(options?: UseInstagramProfilesOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPublicMode = options?.publicMode === true;

  const { data: profiles = [], isLoading, error } = useQuery({
    queryKey: ["instagram-profiles", user?.id, isPublicMode],
    queryFn: async () => {
      // Public mode: fetch all data without user filter
      if (isPublicMode && !user?.id) {
        const { data, error } = await supabase
          .from("instagram_profiles")
          .select("*")
          .order("scraped_at", { ascending: false });

        if (error) throw error;
        return data as InstagramProfile[];
      }

      // Authenticated mode: filter by user_id
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("instagram_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("scraped_at", { ascending: false });

      if (error) throw error;
      return data as InstagramProfile[];
    },
    enabled: !!user?.id || isPublicMode,
  });

  // Get latest profile for each account
  const latestProfiles = (() => {
    const profileMap = new Map<string, InstagramProfile>();
    
    profiles.forEach(profile => {
      const existing = profileMap.get(profile.username);
      if (!existing || new Date(profile.scraped_at) > new Date(existing.scraped_at)) {
        profileMap.set(profile.username, profile);
      }
    });
    
    return Array.from(profileMap.values());
  })();

  const importMutation = useMutation({
    mutationFn: async (profilesData: any[]) => {
      const { data, error } = await supabase.functions.invoke("import-instagram-profiles", {
        body: { profiles: profilesData },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["instagram-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["instagram-analytics"] });
      
      toast.success(
        `${data.profiles.imported} perfis importados, ${data.posts.imported} posts importados`,
        { description: data.profiles.updated > 0 ? `${data.profiles.updated} perfis atualizados` : undefined }
      );
    },
    onError: (error: any) => {
      toast.error(`Erro ao importar: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("instagram_profiles")
        .delete()
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-profiles"] });
      toast.success("Perfis eliminados");
    },
  });

  // Calculate stats
  const stats = (() => {
    if (latestProfiles.length === 0) {
      return {
        totalFollowers: 0,
        totalFollowing: 0,
        totalPosts: 0,
        avgFollowers: 0,
        avgFollowRatio: 0,
        verifiedCount: 0,
        businessCount: 0,
      };
    }

    const totalFollowers = latestProfiles.reduce((sum, p) => sum + p.followers_count, 0);
    const totalFollowing = latestProfiles.reduce((sum, p) => sum + p.follows_count, 0);
    const totalPosts = latestProfiles.reduce((sum, p) => sum + p.posts_count, 0);
    
    const avgFollowRatio = latestProfiles.reduce((sum, p) => {
      const ratio = p.follows_count > 0 ? p.followers_count / p.follows_count : 0;
      return sum + ratio;
    }, 0) / latestProfiles.length;

    return {
      totalFollowers,
      totalFollowing,
      totalPosts,
      avgFollowers: Math.round(totalFollowers / latestProfiles.length),
      avgFollowRatio: Math.round(avgFollowRatio * 100) / 100,
      verifiedCount: latestProfiles.filter(p => p.is_verified).length,
      businessCount: latestProfiles.filter(p => p.is_business_account).length,
    };
  })();

  return {
    profiles,
    latestProfiles,
    stats,
    isLoading,
    error,
    importProfiles: importMutation.mutate,
    isImporting: importMutation.isPending,
    deleteProfiles: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isPublicMode,
  };
}
