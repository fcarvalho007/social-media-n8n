import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { MediaSource } from '@/types/media';

/**
 * useMediaManager
 * ---------------
 * Encapsulates all carousel media state (files, preview URLs, sources, aspect
 * ratios) plus the drag-and-drop / arrow-button reordering handlers.
 *
 * Phase 1 of ManualCreate.tsx refactor — purely mechanical extraction, no
 * behaviour changes. State and handlers are moved verbatim from ManualCreate.
 */
export function useMediaManager() {
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [mediaSources, setMediaSources] = useState<MediaSource[]>([]);
  const [mediaAspectRatios, setMediaAspectRatios] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = mediaPreviewUrls.findIndex((_, i) => `media-${i}` === active.id);
        const newIndex = mediaPreviewUrls.findIndex((_, i) => `media-${i}` === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          setMediaPreviewUrls((prev) => arrayMove(prev, oldIndex, newIndex));
          setMediaFiles((prev) => arrayMove(prev, oldIndex, newIndex));
          setMediaSources((prev) => arrayMove(prev, oldIndex, newIndex));
          toast.success(`Item movido para posição ${newIndex + 1}`);
        }
      }
    },
    [mediaPreviewUrls],
  );

  const moveMedia = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= mediaPreviewUrls.length) return;

      setMediaPreviewUrls((prev) => arrayMove(prev, fromIndex, toIndex));
      setMediaFiles((prev) => arrayMove(prev, fromIndex, toIndex));
      setMediaSources((prev) => arrayMove(prev, fromIndex, toIndex));
      toast.success(`Item movido para posição ${toIndex + 1}`);
    },
    [mediaPreviewUrls.length],
  );

  const removeMedia = useCallback((index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setMediaSources((prev) => prev.filter((_, i) => i !== index));
    setMediaAspectRatios((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Cleanup objectURLs on unmount
  useEffect(() => {
    return () => {
      mediaPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // state
    mediaFiles,
    mediaPreviewUrls,
    mediaSources,
    mediaAspectRatios,
    activeId,
    // setters (still needed by upload / recovery flows in Phase 1)
    setMediaFiles,
    setMediaPreviewUrls,
    setMediaSources,
    setMediaAspectRatios,
    // dnd
    sensors,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
    // helpers
    moveMedia,
    removeMedia,
  };
}

export type MediaManager = ReturnType<typeof useMediaManager>;
