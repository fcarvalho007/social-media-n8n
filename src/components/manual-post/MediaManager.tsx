import { useState } from 'react';
import { MediaItem } from '@/types/social';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FolderOpen, Grid3x3, X, Star, Crop } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MediaManagerProps {
  mediaItems: MediaItem[];
  onMediaChange: (items: MediaItem[]) => void;
  maxItems?: number;
}

function SortableMediaItem({ 
  item, 
  onRemove, 
  onSetCover,
  isCover 
}: { 
  item: MediaItem; 
  onRemove: () => void;
  onSetCover: () => void;
  isCover: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group aspect-square rounded-lg overflow-hidden border-2 border-border bg-card hover:border-primary/50 transition-all cursor-move"
    >
      <img
        src={item.thumbnail_url || item.url}
        alt={item.alt_text || 'Media item'}
        className="w-full h-full object-cover"
      />
      
      {isCover && (
        <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
          <Star className="h-3 w-3 mr-1 fill-current" />
          Cover
        </Badge>
      )}

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {!isCover && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onSetCover();
            }}
          >
            <Star className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement crop
          }}
        >
          <Crop className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {item.type === 'video' && item.duration && (
        <Badge variant="secondary" className="absolute bottom-2 right-2 text-xs">
          {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
        </Badge>
      )}
    </div>
  );
}

export function MediaManager({ mediaItems, onMediaChange, maxItems = 10 }: MediaManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = mediaItems.findIndex(item => item.id === active.id);
      const newIndex = mediaItems.findIndex(item => item.id === over.id);
      const newItems = arrayMove(mediaItems, oldIndex, newIndex);
      onMediaChange(newItems.map((item, index) => ({ ...item, order: index })));
    }
  };

  const handleRemove = (id: string) => {
    onMediaChange(mediaItems.filter(item => item.id !== id));
  };

  const handleSetCover = (id: string) => {
    onMediaChange(
      mediaItems.map(item => ({
        ...item,
        is_cover: item.id === id,
      }))
    );
  };

  const handleUpload = () => {
    // TODO: Implement file upload
    console.log('Upload clicked');
  };

  const handleLibrary = () => {
    // TODO: Implement media library
    console.log('Library clicked');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media</CardTitle>
        <CardDescription>
          {mediaItems.length === 0 
            ? 'Add images or videos to start building your post'
            : `${mediaItems.length} of ${maxItems} items`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={handleUpload} className="flex-1">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <Button onClick={handleLibrary} variant="outline" className="flex-1">
            <FolderOpen className="h-4 w-4 mr-2" />
            Library
          </Button>
        </div>

        {mediaItems.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={mediaItems.map(i => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-3">
                {mediaItems.map((item) => (
                  <SortableMediaItem
                    key={item.id}
                    item={item}
                    onRemove={() => handleRemove(item.id)}
                    onSetCover={() => handleSetCover(item.id)}
                    isCover={item.is_cover || false}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {mediaItems.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Grid3x3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No media added yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
