import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Minus, Plus, Coins } from 'lucide-react';
import { 
  AI_IMAGE_MODELS,
  AI_ASPECT_RATIOS,
  AI_MAX_PROMPT_LENGTH,
  AI_MIN_IMAGES,
  AI_MAX_IMAGES,
  AIModelId,
  AIAspectRatio,
} from '@/lib/ai-generator/constants';
import { AIGenerateParams } from '@/lib/ai-generator/types';

interface AIGeneratorFormProps {
  onGenerate: (params: AIGenerateParams) => void;
  disabled?: boolean;
}

export function AIGeneratorForm({ onGenerate, disabled }: AIGeneratorFormProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<AIModelId>('nano-banana-pro');
  const [aspectRatio, setAspectRatio] = useState<AIAspectRatio>('1:1');
  const [count, setCount] = useState(1);

  const selectedModel = AI_IMAGE_MODELS.find(m => m.id === model);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    
    onGenerate({
      prompt: prompt.trim(),
      model,
      aspectRatio,
      count,
    });
  };

  const incrementCount = () => {
    if (count < AI_MAX_IMAGES) {
      setCount(count + 1);
    }
  };

  const decrementCount = () => {
    if (count > AI_MIN_IMAGES) {
      setCount(count - 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="prompt" className="text-sm font-medium">Descreve a imagem</Label>
          <span className="text-xs text-muted-foreground">
            {prompt.length}/{AI_MAX_PROMPT_LENGTH}
          </span>
        </div>
        <Textarea
          id="prompt"
          placeholder="Ex: Uma paisagem minimalista com montanhas ao pôr do sol, cores suaves..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, AI_MAX_PROMPT_LENGTH))}
          disabled={disabled}
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      {/* Compact Controls Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Model Selector */}
        <Select 
          value={model} 
          onValueChange={(v) => setModel(v as AIModelId)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue>
              <span className="flex items-center gap-1.5">
                <span>{selectedModel?.icon}</span>
                <span className="text-sm truncate">{selectedModel?.name}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {AI_IMAGE_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex items-center gap-2">
                  <span>{m.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Aspect Ratio Selector */}
        <Select 
          value={aspectRatio} 
          onValueChange={(v) => setAspectRatio(v as AIAspectRatio)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_ASPECT_RATIOS.map((ar) => (
              <SelectItem key={ar.value} value={ar.value}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-sm">{ar.label}</span>
                  <span className="text-xs text-muted-foreground">{ar.description}</span>
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
            disabled={disabled || count <= AI_MIN_IMAGES}
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
            disabled={disabled || count >= AI_MAX_IMAGES}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Generate Button with credit count */}
        <Button 
          onClick={handleSubmit}
          disabled={disabled || !prompt.trim()}
          size="sm"
          className="h-9 gap-1.5 ml-auto"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Gerar ({count} crédito{count > 1 ? 's' : ''})
        </Button>
      </div>

      {/* Cost Info */}
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Coins className="h-3 w-3" />
        Consumo: ~1 crédito por imagem gerada
      </p>
    </div>
  );
}
