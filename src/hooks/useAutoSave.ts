import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostFormat } from '@/types/social';

interface AutoSaveData {
  caption: string;
  selectedFormats: PostFormat[];
  mediaUrls: string[];
  scheduledDate?: string;
  time?: string;
  scheduleAsap: boolean;
}

interface UseAutoSaveOptions {
  key?: string;
  interval?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  lastSaved: Date | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  saveNow: () => Promise<void>;
  loadSavedData: () => AutoSaveData | null;
  clearSavedData: () => void;
}

const LOCAL_STORAGE_KEY = 'manual-create-autosave';

export function useAutoSave(
  data: AutoSaveData,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const { 
    key = LOCAL_STORAGE_KEY, 
    interval = 30000, // 30 seconds
    enabled = true 
  } = options;

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const dataRef = useRef(data);
  const lastSavedDataRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data;
    
    // Check if data has changed since last save
    const currentDataStr = JSON.stringify(data);
    if (currentDataStr !== lastSavedDataRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [data]);

  // Save function
  const saveToLocalStorage = useCallback(async () => {
    if (!enabled) return;
    
    const currentData = dataRef.current;
    const currentDataStr = JSON.stringify(currentData);
    
    // Skip if nothing to save or data hasn't changed
    if (!currentData.caption && currentData.selectedFormats.length === 0 && currentData.mediaUrls.length === 0) {
      return;
    }
    
    if (currentDataStr === lastSavedDataRef.current) {
      return;
    }

    setIsSaving(true);
    
    try {
      // Save to localStorage
      const saveData = {
        ...currentData,
        savedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(key, JSON.stringify(saveData));
      lastSavedDataRef.current = currentDataStr;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      // Also try to save to Supabase if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user && currentData.selectedFormats.length > 0) {
        // Save minimal draft to database
        await supabase.from('posts_drafts').upsert({
          id: `autosave-${user.id}`,
          user_id: user.id,
          platform: currentData.selectedFormats[0]?.startsWith('instagram_') ? 'instagram_carrousel' : 'linkedin',
          caption: currentData.caption,
          media_urls: currentData.mediaUrls,
          scheduled_date: currentData.scheduledDate || null,
          scheduled_time: currentData.time || null,
          publish_immediately: currentData.scheduleAsap,
          status: 'autosave',
        });
      }
    } catch (error) {
      console.error('[AutoSave] Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  }, [key, enabled]);

  // Auto-save interval
  useEffect(() => {
    if (!enabled) return;

    saveTimeoutRef.current = setInterval(() => {
      saveToLocalStorage();
    }, interval);

    return () => {
      if (saveTimeoutRef.current) {
        clearInterval(saveTimeoutRef.current);
      }
    };
  }, [saveToLocalStorage, interval, enabled]);

  // Save on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges) {
        const currentData = dataRef.current;
        const saveData = {
          ...currentData,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(saveData));
      }
    };
  }, [hasUnsavedChanges, key]);

  // Load saved data
  const loadSavedData = useCallback((): AutoSaveData | null => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          caption: parsed.caption || '',
          selectedFormats: parsed.selectedFormats || [],
          mediaUrls: parsed.mediaUrls || [],
          scheduledDate: parsed.scheduledDate,
          time: parsed.time,
          scheduleAsap: parsed.scheduleAsap || false,
        };
      }
    } catch (error) {
      console.error('[AutoSave] Error loading:', error);
    }
    return null;
  }, [key]);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    localStorage.removeItem(key);
    lastSavedDataRef.current = '';
    setLastSaved(null);
    setHasUnsavedChanges(false);
  }, [key]);

  // Manual save
  const saveNow = useCallback(async () => {
    await saveToLocalStorage();
  }, [saveToLocalStorage]);

  return {
    lastSaved,
    isSaving,
    hasUnsavedChanges,
    saveNow,
    loadSavedData,
    clearSavedData,
  };
}
