import { useState, useEffect, useRef, useCallback } from 'react';
import { PostFormat } from '@/types/social';

interface AutoSaveData {
  caption: string;
  networkCaptions?: Record<string, string>;
  useSeparateCaptions?: boolean;
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
  saveNow: () => void;
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

  // Save function - localStorage only (database drafts use explicit save)
  const saveToLocalStorage = useCallback(() => {
    if (!enabled) return;
    
    const currentData = dataRef.current;
    const currentDataStr = JSON.stringify(currentData);
    
    // Skip if nothing to save or data hasn't changed
    const hasNetworkCaptions = Object.values(currentData.networkCaptions ?? {}).some((value) => value.trim().length > 0);
    if (!currentData.caption && !hasNetworkCaptions && currentData.selectedFormats.length === 0 && currentData.mediaUrls.length === 0) {
      return;
    }
    
    if (currentDataStr === lastSavedDataRef.current) {
      return;
    }

    setIsSaving(true);
    
    try {
      // Save to localStorage only - database saves are handled by handleSaveDraft
      const saveData = {
        ...currentData,
        savedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(key, JSON.stringify(saveData));
      lastSavedDataRef.current = currentDataStr;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('[AutoSave] Error saving to localStorage:', error);
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
          networkCaptions: parsed.networkCaptions || {},
          useSeparateCaptions: parsed.useSeparateCaptions || false,
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
  const saveNow = useCallback(() => {
    saveToLocalStorage();
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
