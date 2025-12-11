import { Instagram, Linkedin, Image, Calendar, Clock, Trash2, Edit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Draft {
  id: string;
  platform: string;
  caption: string | null;
  media_urls: any;
  scheduled_date: string | null;
  scheduled_time: string | null;
  created_at: string;
}

interface DraftCardProps {
  draft: Draft;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onEdit: (draft: Draft) => void;
  onDelete: (id: string) => void;
  view: 'list' | 'grid';
}

const platformConfig: Record<string, { icon: React.ComponentType<any>; label: string; color: string }> = {
  'instagram-carousel': { icon: Instagram, label: 'Instagram Carrossel', color: 'bg-pink-500/10 text-pink-600' },
  'instagram-stories': { icon: Instagram, label: 'Instagram Stories', color: 'bg-purple-500/10 text-purple-600' },
  'instagram-reels': { icon: Instagram, label: 'Instagram Reels', color: 'bg-orange-500/10 text-orange-600' },
  'linkedin': { icon: Linkedin, label: 'LinkedIn', color: 'bg-blue-500/10 text-blue-600' },
  'linkedin-document': { icon: Linkedin, label: 'LinkedIn Documento', color: 'bg-sky-500/10 text-sky-600' },
};

export function DraftCard({ draft, isSelected, onSelect, onEdit, onDelete, view }: DraftCardProps) {
  const config = platformConfig[draft.platform] || { 
    icon: Image, 
    label: draft.platform, 
    color: 'bg-muted text-muted-foreground' 
  };
  const Icon = config.icon;
  
  const mediaCount = Array.isArray(draft.media_urls) ? draft.media_urls.length : 0;
  const createdDate = format(new Date(draft.created_at), "d MMM yyyy", { locale: pt });
  const createdTime = format(new Date(draft.created_at), "HH:mm");
  
  const truncatedCaption = draft.caption 
    ? draft.caption.length > 100 
      ? `${draft.caption.substring(0, 100)}...` 
      : draft.caption
    : 'Sem legenda';

  if (view === 'grid') {
    return (
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(draft.id, !!checked)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className={cn("gap-1", config.color)}>
                  <Icon className="h-3 w-3" />
                  <span className="text-xs">{config.label}</span>
                </Badge>
              </div>
              
              <p className="text-sm text-foreground line-clamp-3 mb-3">
                {truncatedCaption}
              </p>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {createdDate}
                </span>
                <span className="flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  {mediaCount} {mediaCount === 1 ? 'ficheiro' : 'ficheiros'}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onEdit(draft)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(draft.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "group transition-all duration-200 hover:shadow-md",
      isSelected && "ring-2 ring-primary"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(draft.id, !!checked)}
          />
          
          <div className={cn("p-2.5 rounded-lg", config.color)}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{config.label}</span>
              {draft.scheduled_date && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  Agendado
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {truncatedCaption}
            </p>
          </div>
          
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Image className="h-4 w-4" />
              {mediaCount}
            </span>
            <span className="flex items-center gap-1.5 min-w-[80px]">
              <Calendar className="h-4 w-4" />
              {createdDate}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onEdit(draft)}
            >
              <Edit className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(draft.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
