import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface InstagramAnalyticsItem {
  id: string;
  user_id: string;
  post_url: string;
  shortcode: string | null;
  post_type: string | null;
  caption: string | null;
  hashtags: string[];
  likes_count: number;
  comments_count: number;
  views_count: number;
  engagement_rate: number;
  media_urls: string[];
  thumbnail_url: string | null;
  posted_at: string | null;
  location_name: string | null;
  owner_username: string | null;
  is_video: boolean;
  video_duration: number | null;
  imported_at: string;
  created_at: string;
}

export interface AnalyticsStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  avgLikes: number;
  avgComments: number;
  avgEngagement: number;
  bestPost: InstagramAnalyticsItem | null;
  worstPost: InstagramAnalyticsItem | null;
  topHashtags: { tag: string; count: number; avgLikes: number }[];
  contentTypeBreakdown: { type: string; count: number; avgEngagement: number }[];
  engagementOverTime: { date: string; likes: number; comments: number; posts: number }[];
}

interface UseInstagramAnalyticsOptions {
  publicMode?: boolean;
}

export function useInstagramAnalytics(options?: UseInstagramAnalyticsOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isPublicMode = options?.publicMode === true;

  const { data: analytics = [], isLoading, error } = useQuery({
    queryKey: ["instagram-analytics", user?.id, isPublicMode],
    queryFn: async () => {
      // Public mode: fetch all data without user filter
      if (isPublicMode && !user?.id) {
        const { data, error } = await supabase
          .from("instagram_analytics")
          .select("*")
          .order("posted_at", { ascending: false });

        if (error) throw error;
        return data as InstagramAnalyticsItem[];
      }

      // Authenticated mode: filter by user_id
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("instagram_analytics")
        .select("*")
        .eq("user_id", user.id)
        .order("posted_at", { ascending: false });

      if (error) throw error;
      return data as InstagramAnalyticsItem[];
    },
    enabled: !!user?.id || isPublicMode,
  });

  const importMutation = useMutation({
    mutationFn: async (posts: any[]) => {
      const { data, error } = await supabase.functions.invoke("import-instagram-data", {
        body: { posts, alsoImportToMediaLibrary: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["instagram-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["media-library"] });
      
      // More informative toast with duplicate info
      if (data.duplicates > 0) {
        toast.success(
          `${data.imported} posts importados, ${data.duplicates} duplicados ignorados`,
          { description: `Total processado: ${data.total}` }
        );
      } else {
        toast.success(`${data.imported} publicações importadas com sucesso!`);
      }
    },
    onError: (error: any) => {
      toast.error(`Erro ao importar: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("instagram_analytics")
        .delete()
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-analytics"] });
      toast.success("Dados eliminados");
    },
  });

  // Calculate comprehensive stats
  const stats: AnalyticsStats = (() => {
    if (analytics.length === 0) {
      return {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalViews: 0,
        avgLikes: 0,
        avgComments: 0,
        avgEngagement: 0,
        bestPost: null,
        worstPost: null,
        topHashtags: [],
        contentTypeBreakdown: [],
        engagementOverTime: [],
      };
    }

    const totalLikes = analytics.reduce((sum, p) => sum + (p.likes_count || 0), 0);
    const totalComments = analytics.reduce((sum, p) => sum + (p.comments_count || 0), 0);
    const totalViews = analytics.reduce((sum, p) => sum + (p.views_count || 0), 0);

    // Best/worst by engagement
    const sorted = [...analytics].sort(
      (a, b) => (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count)
    );

    // Hashtag analysis
    const hashtagMap = new Map<string, { count: number; totalLikes: number }>();
    analytics.forEach((post) => {
      (post.hashtags || []).forEach((tag) => {
        const existing = hashtagMap.get(tag) || { count: 0, totalLikes: 0 };
        hashtagMap.set(tag, {
          count: existing.count + 1,
          totalLikes: existing.totalLikes + (post.likes_count || 0),
        });
      });
    });

    const topHashtags = Array.from(hashtagMap.entries())
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        avgLikes: Math.round(data.totalLikes / data.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Content type breakdown
    const typeMap = new Map<string, { count: number; totalEngagement: number }>();
    analytics.forEach((post) => {
      const type = post.post_type || "Image";
      const existing = typeMap.get(type) || { count: 0, totalEngagement: 0 };
      typeMap.set(type, {
        count: existing.count + 1,
        totalEngagement: existing.totalEngagement + (post.likes_count || 0) + (post.comments_count || 0),
      });
    });

    const contentTypeBreakdown = Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      avgEngagement: Math.round(data.totalEngagement / data.count),
    }));

    // Engagement over time (group by month)
    const timeMap = new Map<string, { likes: number; comments: number; posts: number }>();
    analytics.forEach((post) => {
      if (!post.posted_at) return;
      const date = new Date(post.posted_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = timeMap.get(key) || { likes: 0, comments: 0, posts: 0 };
      timeMap.set(key, {
        likes: existing.likes + (post.likes_count || 0),
        comments: existing.comments + (post.comments_count || 0),
        posts: existing.posts + 1,
      });
    });

    const engagementOverTime = Array.from(timeMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalPosts: analytics.length,
      totalLikes,
      totalComments,
      totalViews,
      avgLikes: Math.round(totalLikes / analytics.length),
      avgComments: Math.round(totalComments / analytics.length),
      avgEngagement: Math.round((totalLikes + totalComments) / analytics.length),
      bestPost: sorted[0] || null,
      worstPost: sorted[sorted.length - 1] || null,
      topHashtags,
      contentTypeBreakdown,
      engagementOverTime,
    };
  })();

  return {
    analytics,
    stats,
    isLoading,
    error,
    importPosts: importMutation.mutate,
    isImporting: importMutation.isPending,
    deleteAnalytics: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isPublicMode,
  };
}
