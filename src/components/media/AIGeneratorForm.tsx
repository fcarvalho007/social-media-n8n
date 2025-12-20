import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Minus, Plus } from 'lucide-react';
import { 
  HIGGSFIELD_ASPECT_RATIOS, 
  HIGGSFIELD_RESOLUTIONS,
  HIGGSFIELD_MAX_PROMPT_LENGTH,
  HIGGSFIELD_MIN_IMAGES,
  HIGGSFIELD_MAX_IMAGES
} from '@/lib/higgsfield/constants';
import { 
  HiggsfieldGenerateParams, 
  HiggsfieldAspectRatio, 
  HiggsfieldResolution 
} from '@/lib/higgsfield/types';

interface AIGeneratorFormProps {
  onGenerate: (params: HiggsfieldGenerateParams) => void;
  disabled?: boolean;
}

export function AIGeneratorForm({ onGenerate, disabled }: AIGeneratorFormProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<HiggsfieldAspectRatio>('3:4');
  const [resolution, setResolution] = useState<HiggsfieldResolution>('1080p');
  const [count, setCount] = useState(1);

  const selectedResolution = HIGGSFIELD_RESOLUTIONS.find(r => r.value === resolution);
  const estimatedCost = count * (resolution === '1080p' ? 0.19 : 0.09);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    
    onGenerate({
      prompt: prompt.trim(),
      aspectRatio,
      resolution,
      count,
    });
  };

  const incrementCount = () => {
    if (count < HIGGSFIELD_MAX_IMAGES) {
      setCount(count + 1);
    }
  };

  const decrementCount = () => {
    if (count > HIGGSFIELD_MIN_IMAGES) {
      setCount(count - 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="prompt">Descrição da Imagem</Label>
          <span className="text-xs text-muted-foreground">
            {prompt.length}/{HIGGSFIELD_MAX_PROMPT_LENGTH}
          </span>
        </div>
        <Textarea
          id="prompt"
          placeholder="Descreva a imagem que pretende gerar em detalhe. Por exemplo: 'Uma paisagem minimalista com montanhas ao pôr do sol, cores suaves em tons de laranja e roxo, estilo fotográfico'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, HIGGSFIELD_MAX_PROMPT_LENGTH))}
          disabled={disabled}
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label>Proporção</Label>
        <Select 
          value={aspectRatio} 
          onValueChange={(v) => setAspectRatio(v as HiggsfieldAspectRatio)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HIGGSFIELD_ASPECT_RATIOS.map((ar) => (
              <SelectItem key={ar.value} value={ar.value}>
                <div className="flex flex-col">
                  <span>{ar.label}</span>
                  <span className="text-xs text-muted-foreground">{ar.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Resolution */}
      <div className="space-y-2">
        <Label>Qualidade</Label>
        <Select 
          value={resolution} 
          onValueChange={(v) => setResolution(v as HiggsfieldResolution)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HIGGSFIELD_RESOLUTIONS.map((res) => (
              <SelectItem key={res.value} value={res.value}>
                <div className="flex items-center gap-2">
                  <span>{res.label}</span>
                  <Badge variant="secondary" className="text-xs">{res.price}</Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <Label>Quantidade de Imagens</Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={decrementCount}
            disabled={disabled || count <= HIGGSFIELD_MIN_IMAGES}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium w-8 text-center">{count}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={incrementCount}
            disabled={disabled || count >= HIGGSFIELD_MAX_IMAGES}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            (máx. {HIGGSFIELD_MAX_IMAGES})
          </span>
        </div>
      </div>

      {/* Cost Estimate */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <span className="text-sm text-muted-foreground">Custo estimado:</span>
        <Badge variant="outline" className="font-mono">
          ~${estimatedCost.toFixed(2)} USD
        </Badge>
      </div>

      {/* Generate Button */}
      <Button 
        onClick={handleSubmit}
        disabled={disabled || !prompt.trim()}
        className="w-full"
        size="lg"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Gerar {count} {count === 1 ? 'Imagem' : 'Imagens'}
      </Button>
    </div>
  );
}
