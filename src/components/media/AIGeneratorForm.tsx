import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Minus, Plus, DollarSign, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AI_IMAGE_MODELS,
  NANO_BANANA_ASPECT_RATIOS,
  NANO_BANANA_RESOLUTIONS,
  GPT_IMAGE_SIZES,
  GPT_IMAGE_QUALITIES,
  AI_MAX_PROMPT_LENGTH,
  AI_MIN_IMAGES,
  AI_MAX_IMAGES,
  calculateNanoBananaCost,
  calculateGPTImageCost,
  formatCost,
  getMinPrice,
} from '@/lib/ai-generator/constants';
import { 
  AIGenerateParams, 
  AIModelId, 
  AIAspectRatio, 
  AIResolution, 
  AIQuality, 
  AIImageSize 
} from '@/lib/ai-generator/types';

interface AIGeneratorFormProps {
  onGenerate: (params: AIGenerateParams) => void;
  disabled?: boolean;
}

export function AIGeneratorForm({ onGenerate, disabled }: AIGeneratorFormProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<AIModelId>('nano-banana-pro');
  
  // Nano Banana Pro options - defaults: 16:9 and 2K
  const [aspectRatio, setAspectRatio] = useState<AIAspectRatio>('16:9');
  const [resolution, setResolution] = useState<AIResolution>('2K');
  
  // GPT Image 1.5 options
  const [imageSize, setImageSize] = useState<AIImageSize>('1024x1024');
  const [quality, setQuality] = useState<AIQuality>('high');
  
  const [count, setCount] = useState(1);

  const selectedModel = AI_IMAGE_MODELS.find(m => m.id === model);
  const isNanoBanana = model === 'nano-banana-pro';

  // Calculate total cost based on model and options
  const totalCost = useMemo(() => {
    if (isNanoBanana) {
      return calculateNanoBananaCost(resolution, count);
    } else {
      return calculateGPTImageCost(quality, imageSize, count);
    }
  }, [model, resolution, quality, imageSize, count, isNanoBanana]);

  // Get per-image cost
  const perImageCost = useMemo(() => {
    if (isNanoBanana) {
      return calculateNanoBananaCost(resolution, 1);
    } else {
      return calculateGPTImageCost(quality, imageSize, 1);
    }
  }, [model, resolution, quality, imageSize, isNanoBanana]);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    
    const params: AIGenerateParams = {
      prompt: prompt.trim(),
      model,
      count,
    };

    if (isNanoBanana) {
      params.aspectRatio = aspectRatio;
      params.resolution = resolution;
    } else {
      params.imageSize = imageSize;
      params.quality = quality;
    }
    
    onGenerate(params);
  };

  const handleModelChange = (newModel: AIModelId) => {
    setModel(newModel);
    // Reset options when switching models with correct defaults
    if (newModel === 'nano-banana-pro') {
      setAspectRatio('16:9');  // Default
      setResolution('2K');     // Default
    } else {
      setImageSize('1024x1024');
      setQuality('high');
    }
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
    <TooltipProvider>
      <div className="space-y-4">
        {/* Model Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Modelo</Label>
          <Select 
            value={model} 
            onValueChange={(v) => handleModelChange(v as AIModelId)}
            disabled={disabled}
          >
            <SelectTrigger className="w-full h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_IMAGE_MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex items-center gap-3 w-full py-1">
                    <span className="text-lg">{m.icon}</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.description} • desde {formatCost(getMinPrice(m.id))}/img
                      </span>
                    </div>
                  </div>
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

        {/* Model-specific options */}
        {isNanoBanana ? (
          /* Nano Banana Pro Options */
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Rácio</Label>
              <Select 
                value={aspectRatio} 
                onValueChange={(v) => setAspectRatio(v as AIAspectRatio)}
                disabled={disabled}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NANO_BANANA_ASPECT_RATIOS.map((ar) => (
                    <SelectItem key={ar.value} value={ar.value}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-sm">{ar.label}</span>
                        <span className="text-xs text-muted-foreground">{ar.description}</span>
                        {ar.value === '16:9' && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">padrão</Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Resolução</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>4K custa o dobro ($0.30/img)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select 
                value={resolution} 
                onValueChange={(v) => setResolution(v as AIResolution)}
                disabled={disabled}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NANO_BANANA_RESOLUTIONS.map((res) => (
                    <SelectItem key={res.value} value={res.value}>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{res.label}</span>
                        <span className="text-xs text-muted-foreground">{res.description}</span>
                        {res.value === '2K' && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">padrão</Badge>
                        )}
                        {res.value === '4K' && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">2×</Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          /* GPT Image 1.5 Options */
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tamanho</Label>
              <Select 
                value={imageSize} 
                onValueChange={(v) => setImageSize(v as AIImageSize)}
                disabled={disabled}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GPT_IMAGE_SIZES.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-sm">{size.label}</span>
                        <span className="text-xs text-muted-foreground">{size.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Qualidade</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">
                    <p className="text-xs">
                      Low: {formatCost(0.009)}-{formatCost(0.013)}<br/>
                      Medium: {formatCost(0.034)}-{formatCost(0.051)}<br/>
                      High: {formatCost(0.133)}-{formatCost(0.200)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select 
                value={quality} 
                onValueChange={(v) => setQuality(v as AIQuality)}
                disabled={disabled}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GPT_IMAGE_QUALITIES.map((q) => (
                    <SelectItem key={q.value} value={q.value}>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{q.label}</span>
                        <span className="text-xs text-muted-foreground">{q.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Cost Preview */}
        <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Custo estimado</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-foreground">{formatCost(totalCost)}</span>
              {count > 1 && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({count} × {formatCost(perImageCost)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center gap-3">
          {/* Quantity Counter */}
          <div className="flex items-center gap-1 border rounded-lg px-2 py-1">
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
            <span className="text-sm font-medium w-6 text-center">{count}</span>
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

          {/* Generate Button */}
          <Button 
            onClick={handleSubmit}
            disabled={disabled || !prompt.trim()}
            className="flex-1 h-10 gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Gerar {count} {count === 1 ? 'imagem' : 'imagens'}</span>
            <Badge 
              variant="secondary" 
              className="text-xs px-1.5 py-0 bg-background/20 border-none"
            >
              {formatCost(totalCost)}
            </Badge>
          </Button>
        </div>

        {/* Provider Info */}
        <p className="text-xs text-muted-foreground text-center">
          Usa fal.ai • {formatCost(perImageCost)}/imagem com opções seleccionadas
        </p>
      </div>
    </TooltipProvider>
  );
}
