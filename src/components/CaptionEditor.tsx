import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

interface CaptionEditorProps {
  initialCaption: string;
  initialHashtags: string[];
  onChange: (caption: string, hashtags: string[]) => void;
}

export const CaptionEditor = ({ initialCaption, initialHashtags, onChange }: CaptionEditorProps) => {
  const [caption, setCaption] = useState(initialCaption);
  const [hashtags, setHashtags] = useState<string[]>(initialHashtags);
  const [newHashtag, setNewHashtag] = useState('');

  const maxCaptionLength = 2200;

  useEffect(() => {
    onChange(caption, hashtags);
  }, [caption, hashtags]);

  const addHashtag = () => {
    if (newHashtag.trim() && !hashtags.includes(newHashtag.trim())) {
      const tag = newHashtag.trim().startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`;
      setHashtags([...hashtags, tag]);
      setNewHashtag('');
    }
  };

  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  const handleRestore = () => {
    setCaption(initialCaption);
    setHashtags(initialHashtags);
  };

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="caption" className="text-base font-semibold">
            Caption
          </Label>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${caption.length > maxCaptionLength ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {caption.length}/{maxCaptionLength}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestore}
            >
              Restore original
            </Button>
          </div>
        </div>
        <Textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="min-h-[150px] resize-none"
          placeholder="Write your Instagram caption here..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hashtags" className="text-base font-semibold">
          Hashtags
        </Label>
        <div className="flex gap-2">
          <Input
            id="hashtags"
            value={newHashtag}
            onChange={(e) => setNewHashtag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
            placeholder="Add hashtag (without #)"
            className="flex-1"
          />
          <Button type="button" onClick={addHashtag} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {hashtags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 px-3 py-1.5"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeHashtag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};
