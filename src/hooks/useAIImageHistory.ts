import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIHistoryImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  prompt?: string;
  createdAt: string;
  cost?: number;
}

interface UseAIImageHistoryReturn {
  historyImages: AIHistoryImage[];
  isLoading: boolean;
  saveToHistory: (imageUrl: string, prompt?: string, cost?: number) => Promise<string | null>;
  deleteFromHistory: (id: string) => Promise<boolean>;
  refreshHistory: () => Promise<void>;
}

export function useAIImageHistory(): UseAIImageHistoryReturn {
  const [historyImages, setHistoryImages] = useState<AIHistoryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const savedUrlsRef = useRef<Set<string>>(new Set());
  const isFetchingRef = useRef(false);

  const fetchHistory = useCallback(async () => {
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('media_library')
        .select('id, file_url, thumbnail_url, ai_prompt, created_at, file_size')
        .eq('user_id', user.id)
        .eq('source', 'ai')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching AI history:', error);
        return;
      }

      const images: AIHistoryImage[] = (data || []).map(item => {
        savedUrlsRef.current.add(item.file_url);
        return {
          id: item.id,
          url: item.file_url,
          thumbnailUrl: item.thumbnail_url || item.file_url,
          prompt: item.ai_prompt || undefined,
          createdAt: item.created_at,
        };
      });

      setHistoryImages(images);
    } catch (err) {
      console.error('Error fetching AI history:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const saveToHistory = useCallback(async (imageUrl: string, prompt?: string, cost?: number): Promise<string | null> => {
    // Check if already saved to prevent duplicates
    if (savedUrlsRef.current.has(imageUrl)) {
      console.log('[AIHistory] Image already saved, skipping');
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user logged in');
        return null;
      }

      // Mark as saving immediately to prevent race conditions
      savedUrlsRef.current.add(imageUrl);

      // Download the image and upload to storage
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const fileName = `${user.id}/${Date.now()}-ai-generated.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('ai-generated-images')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading to storage:', uploadError);
        savedUrlsRef.current.delete(imageUrl);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ai-generated-images')
        .getPublicUrl(fileName);

      // Save to media_library
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_library')
        .insert({
          user_id: user.id,
          file_name: `ai-generated-${Date.now()}.png`,
          file_type: 'image/png',
          file_url: publicUrl,
          thumbnail_url: publicUrl,
          file_size: blob.size,
          source: 'ai',
          ai_prompt: prompt || null,
        })
        .select('id')
        .single();

      if (mediaError) {
        console.error('Error saving to media_library:', mediaError);
        savedUrlsRef.current.delete(imageUrl);
        return null;
      }

      // Add to local state without full refresh
      const newImage: AIHistoryImage = {
        id: mediaData.id,
        url: publicUrl,
        thumbnailUrl: publicUrl,
        prompt: prompt,
        createdAt: new Date().toISOString(),
        cost: cost,
      };

      setHistoryImages(prev => [newImage, ...prev]);
      savedUrlsRef.current.add(publicUrl);

      return mediaData?.id || null;
    } catch (err) {
      console.error('Error saving to history:', err);
      savedUrlsRef.current.delete(imageUrl);
      return null;
    }
  }, []);

  const deleteFromHistory = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get the file URL first
      const { data: mediaItem } = await supabase
        .from('media_library')
        .select('file_url')
        .eq('id', id)
        .single();

      if (mediaItem?.file_url) {
        // Remove from saved URLs cache
        savedUrlsRef.current.delete(mediaItem.file_url);
        
        // Extract path from URL and delete from storage
        const urlParts = mediaItem.file_url.split('/ai-generated-images/');
        if (urlParts[1]) {
          await supabase.storage
            .from('ai-generated-images')
            .remove([urlParts[1]]);
        }
      }

      // Delete from media_library
      const { error } = await supabase
        .from('media_library')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting from history:', error);
        return false;
      }

      // Update local state
      setHistoryImages(prev => prev.filter(img => img.id !== id));
      toast.success('Imagem removida do histórico');
      return true;
    } catch (err) {
      console.error('Error deleting from history:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    historyImages,
    isLoading,
    saveToHistory,
    deleteFromHistory,
    refreshHistory: fetchHistory,
  };
}
