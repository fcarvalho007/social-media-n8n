import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { FileImage, ImagePlus, FileText, Calendar } from 'lucide-react';

interface PendingThumbnailProps {
  id: string;
  type: 'story' | 'carousel' | 'post' | 'draft' | 'scheduled';
  thumbnail: string | null;
  route: string;
  onNavigate: (route: string) => void;
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'story': return 'Story';
    case 'carousel': return 'Carrossel';
    case 'post': return 'Post';
    case 'draft': return 'Rascunho';
    case 'scheduled': return 'Agendado';
    default: return type;
  }
};

const getTypeBadgeColor = (type: string) => {
  switch (type) {
    case 'story': return 'bg-green-500/10 text-green-700 border-green-500/30';
    case 'carousel': return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
    case 'post': return 'bg-purple-500/10 text-purple-700 border-purple-500/30';
    case 'draft': return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
    case 'scheduled': return 'bg-sky-500/10 text-sky-700 border-sky-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export function PendingThumbnail({ id, type, thumbnail, route, onNavigate }: PendingThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const showFallback = !thumbnail || imgError;

  return (
    <div
      onClick={() => onNavigate(route)}
      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer 
                 hover:ring-2 hover:ring-primary transition-all group bg-muted"
    >
      {!showFallback && (
        <img 
          src={thumbnail!} 
          alt="" 
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      )}
      {showFallback && (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          {type === 'story' ? (
            <FileImage className="h-8 w-8 text-muted-foreground/50" />
          ) : type === 'carousel' ? (
            <ImagePlus className="h-8 w-8 text-muted-foreground/50" />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground/50" />
          )}
        </div>
      )}
      {/* Badge de tipo */}
      <Badge 
        className={`absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0 h-5 border ${getTypeBadgeColor(type)}`}
      >
        {getTypeLabel(type)}
      </Badge>
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 
                      transition-opacity flex items-center justify-center">
        <span className="text-white text-xs font-medium">Abrir</span>
      </div>
    </div>
  );
}
