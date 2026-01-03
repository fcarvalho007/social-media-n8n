import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Bookmark {
  id: string;
  user_id: string;
  post_shortcode: string;
  notes: string | null;
  created_at: string;
}

export function useAnalyticsBookmarks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["analytics-bookmarks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("analytics_bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Bookmark[];
    },
    enabled: !!user?.id,
  });

  const addBookmark = useMutation({
    mutationFn: async ({ postShortcode, notes }: { postShortcode: string; notes?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("analytics_bookmarks")
        .insert({
          user_id: user.id,
          post_shortcode: postShortcode,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-bookmarks"] });
      toast.success("Post guardado!");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.info("Post já está guardado");
      } else {
        toast.error("Erro ao guardar post");
      }
    },
  });

  const removeBookmark = useMutation({
    mutationFn: async (postShortcode: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("analytics_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("post_shortcode", postShortcode);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-bookmarks"] });
      toast.success("Post removido dos guardados");
    },
    onError: () => {
      toast.error("Erro ao remover post");
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ postShortcode, notes }: { postShortcode: string; notes: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("analytics_bookmarks")
        .update({ notes })
        .eq("user_id", user.id)
        .eq("post_shortcode", postShortcode);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-bookmarks"] });
      toast.success("Notas actualizadas");
    },
  });

  const isBookmarked = (shortcode: string) => {
    return bookmarks.some(b => b.post_shortcode === shortcode);
  };

  const toggleBookmark = (shortcode: string) => {
    if (isBookmarked(shortcode)) {
      removeBookmark.mutate(shortcode);
    } else {
      addBookmark.mutate({ postShortcode: shortcode });
    }
  };

  return {
    bookmarks,
    isLoading,
    addBookmark: addBookmark.mutate,
    removeBookmark: removeBookmark.mutate,
    updateNotes: updateNotes.mutate,
    isBookmarked,
    toggleBookmark,
    isAdding: addBookmark.isPending,
    isRemoving: removeBookmark.isPending,
  };
}
