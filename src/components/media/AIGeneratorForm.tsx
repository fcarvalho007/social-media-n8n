import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Minus, Plus } from 'lucide-react';
import { 
  HIGGSFIELD_MODELS,
  HIGGSFIELD_ASPECT_RATIOS,
  HIGGSFIELD_RESOLUTIONS,
  HIGGSFIELD_MAX_PROMPT_LENGTH,
  HIGGSFIELD_MIN_IMAGES,
  HIGGSFIELD_MAX_IMAGES,
} from '@/lib/higgsfield/constants';
import { HiggsfieldGenerateParams, HiggsfieldAspectRatio, HiggsfieldResolution, HiggsfieldModel } from '@/lib/higgsfield/types';

interface AIGeneratorFormProps {
  onGenerate: (params: HiggsfieldGenerateParams) => void;
  disabled?: boolean;
}

export function AIGeneratorForm({ onGenerate, disabled }: AIGeneratorFormProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<HiggsfieldModel>('google/nano-banana-pro');
  const [aspectRatio, setAspectRatio] = useState<HiggsfieldAspectRatio>('1:1');
  const [resolution, setResolution] = useState<HiggsfieldResolution>('720p');
  const [count, setCount] = useState(1);

  const selectedResolution = HIGGSFIELD_RESOLUTIONS.find(r => r.value === resolution);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    
    onGenerate({
      prompt: prompt.trim(),
      model,
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
      {/* Model Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Modelo</Label>
        <Select 
          value={model} 
          onValueChange={(v) => setModel(v as HiggsfieldModel)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HIGGSFIELD_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                <span className="flex items-center gap-2">
                  <span className="text-sm">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.description}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="prompt" className="text-sm font-medium">Descreve a imagem</Label>
          <span className="text-xs text-muted-foreground">
            {prompt.length}/{HIGGSFIELD_MAX_PROMPT_LENGTH}
          </span>
        </div>
        <Textarea
          id="prompt"
          placeholder="Ex: Uma paisagem minimalista com montanhas ao pôr do sol, cores suaves..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, HIGGSFIELD_MAX_PROMPT_LENGTH))}
          disabled={disabled}
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      {/* Compact Controls Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Aspect Ratio Selector */}
        <Select 
          value={aspectRatio} 
          onValueChange={(v) => setAspectRatio(v as HiggsfieldAspectRatio)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HIGGSFIELD_ASPECT_RATIOS.map((ar) => (
              <SelectItem key={ar.value} value={ar.value}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-sm">{ar.value}</span>
                  <span className="text-xs text-muted-foreground">{ar.description}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Resolution Selector */}
        <Select 
          value={resolution} 
          onValueChange={(v) => setResolution(v as HiggsfieldResolution)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HIGGSFIELD_RESOLUTIONS.map((res) => (
              <SelectItem key={res.value} value={res.value}>
                <span className="flex items-center gap-2">
                  <span className="text-sm">{res.label}</span>
                  <span className="text-xs text-muted-foreground">{res.price}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Quantity Counter */}
        <div className="flex items-center gap-1 border rounded-lg px-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={decrementCount}
            disabled={disabled || count <= HIGGSFIELD_MIN_IMAGES}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-sm font-medium w-5 text-center">{count}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={incrementCount}
            disabled={disabled || count >= HIGGSFIELD_MAX_IMAGES}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleSubmit}
          disabled={disabled || !prompt.trim()}
          size="sm"
          className="h-9 gap-1.5 ml-auto"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Gerar {count} imagem{count > 1 ? 'ns' : ''}
        </Button>
      </div>

      {/* Cost Info */}
      <p className="text-xs text-muted-foreground text-center">
        Usa a tua conta Higgsfield • {selectedResolution?.price}
      </p>
    </div>
  );
}
