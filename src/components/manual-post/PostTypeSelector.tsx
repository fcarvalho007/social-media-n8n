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
      label: 'Imagem',
      icon: ImageIcon,
      description: 'Publicação com uma imagem',
    },
    {
      value: 'video',
      label: 'Vídeo',
      icon: Video,
      description: 'Publicação com um vídeo',
    },
    {
      value: 'carousel',
      label: 'Carrossel (1–10)',
      icon: LayoutGrid,
      description: 'Múltiplas imagens ou vídeos',
    },
    {
      value: 'text',
      label: 'Texto',
      icon: FileText,
      description: 'Publicação apenas com texto',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipo de publicação</CardTitle>
        <CardDescription>Selecione o tipo de conteúdo a criar</CardDescription>
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
