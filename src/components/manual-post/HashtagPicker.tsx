import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Hash, TrendingUp, Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HashtagPickerProps {
  onInsertHashtag: (hashtag: string) => void;
  disabled?: boolean;
}

const POPULAR_HASHTAGS = [
  '#marketing',
  '#socialmedia',
  '#digital',
  '#empreendedorismo',
  '#dicas',
  '#negocios',
  '#sucesso',
  '#motivacao',
  '#trabalho',
  '#produtividade',
];

const RECENT_HASHTAGS = [
  '#conteudo',
  '#estrategia',
  '#crescimento',
];

export function HashtagPicker({ onInsertHashtag, disabled }: HashtagPickerProps) {
  const [open, setOpen] = useState(false);
  const [customHashtag, setCustomHashtag] = useState('');

  const handleInsert = (hashtag: string) => {
    onInsertHashtag(hashtag);
    setOpen(false);
  };

  const handleCustomInsert = () => {
    if (customHashtag.trim()) {
      const tag = customHashtag.startsWith('#') ? customHashtag : `#${customHashtag}`;
      handleInsert(tag);
      setCustomHashtag('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          title="Inserir hashtag"
          disabled={disabled}
        >
          <Hash className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          {/* Custom Hashtag Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={customHashtag}
                onChange={(e) => setCustomHashtag(e.target.value.replace(/\s/g, ''))}
                placeholder="hashtag"
                className="h-8 pl-7 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCustomInsert();
                  }
                }}
              />
            </div>
            <Button 
              size="sm" 
              className="h-8 px-2"
              onClick={handleCustomInsert}
              disabled={!customHashtag.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Recent Hashtags */}
          {RECENT_HASHTAGS.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Recentes</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RECENT_HASHTAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={cn(
                      "cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                    )}
                    onClick={() => handleInsert(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Popular Hashtags */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Populares</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_HASHTAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={cn(
                    "cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                  )}
                  onClick={() => handleInsert(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
