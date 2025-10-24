import { PostType } from '@/types/social';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Image as ImageIcon, Video, LayoutGrid, FileText } from 'lucide-react';

interface PostTypeSelectorProps {
  postType: PostType;
  onPostTypeChange: (type: PostType) => void;
}

export function PostTypeSelector({ postType, onPostTypeChange }: PostTypeSelectorProps) {
  const postTypes: { value: PostType; label: string; icon: any; description: string }[] = [
    {
      value: 'image',
      label: 'Image',
      icon: ImageIcon,
      description: 'Single image post',
    },
    {
      value: 'video',
      label: 'Video',
      icon: Video,
      description: 'Single video post',
    },
    {
      value: 'carousel',
      label: 'Carousel (1–10)',
      icon: LayoutGrid,
      description: 'Multiple images or videos',
    },
    {
      value: 'text',
      label: 'Text',
      icon: FileText,
      description: 'Text-only post',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post type</CardTitle>
        <CardDescription>Select the type of content to create</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={postType} onValueChange={(value) => onPostTypeChange(value as PostType)}>
          <div className="grid grid-cols-2 gap-3">
            {postTypes.map((type) => (
              <div key={type.value} className="relative">
                <RadioGroupItem
                  value={type.value}
                  id={type.value}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={type.value}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    postType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border/80 hover:bg-accent/50'
                  }`}
                >
                  <type.icon className="h-6 w-6" />
                  <div className="text-center">
                    <p className="font-semibold text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
