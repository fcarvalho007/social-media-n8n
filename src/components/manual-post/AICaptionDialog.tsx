import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, RefreshCw, Check, ArrowRight, Briefcase, Smile, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AICaptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCaption: string;
  onApplyCaption: (caption: string) => void;
}

const FRAMEWORKS = [
  {
    id: 'hook',
    name: 'HOOK → PROVA → BENEFÍCIO → AÇÃO',
    description: 'Captar atenção, validar autoridade e gerar conversão',
    icon: '🎯',
  },
  {
    id: 'dor',
    name: 'DOR → SOLUÇÃO → EVIDÊNCIA → CTA',
    description: 'Ideal para conteúdos educativos e de autoridade',
    icon: '💡',
  },
  {
    id: 'ideia',
    name: 'IDEIA CENTRAL → LISTA → VALIDAÇÃO',
    description: 'Minimalista, para conteúdos rápidos e checklists',
    icon: '✨',
  },
];

const TONES = [
  {
    id: 'professional',
    name: 'Profissional',
    description: 'Tom corporativo e formal',
    icon: Briefcase,
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Descontraído e próximo',
    icon: Smile,
  },
  {
    id: 'fun',
    name: 'Divertido',
    description: 'Criativo e com humor',
    icon: PartyPopper,
  },
];

interface Suggestion {
  id: string;
  caption: string;
  tone: string;
}

export default function AICaptionDialog({
  open,
  onOpenChange,
  currentCaption,
  onApplyCaption,
}: AICaptionDialogProps) {
  const [selectedFramework, setSelectedFramework] = useState('hook');
  const [selectedTone, setSelectedTone] = useState('casual');
  const [topicDescription, setTopicDescription] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!currentCaption.trim() && !topicDescription.trim()) {
      toast.error('Escreva uma legenda ou descreva o tema');
      return;
    }

    setIsGenerating(true);
    setSuggestions([]);
    setSelectedSuggestion(null);

    try {
      // Generate 3 suggestions with different variations
      const generatedSuggestions: Suggestion[] = [];
      
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase.functions.invoke('improve-caption', {
          body: {
            caption: currentCaption || topicDescription,
            framework: selectedFramework,
            tone: selectedTone,
            variation: i + 1,
            topic: topicDescription,
          },
        });

        if (error) throw error;

        if (data?.improvedCaption) {
          generatedSuggestions.push({
            id: `suggestion-${i}`,
            caption: data.improvedCaption,
            tone: selectedTone,
          });
        }
      }

      if (generatedSuggestions.length > 0) {
        setSuggestions(generatedSuggestions);
        toast.success(`${generatedSuggestions.length} sugestões geradas!`);
      } else {
        toast.error('Não foi possível gerar sugestões');
      }
    } catch (error) {
      console.error('Error improving caption:', error);
      toast.error('Erro ao gerar sugestões. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    const suggestion = suggestions.find(s => s.id === selectedSuggestion);
    if (suggestion) {
      onApplyCaption(suggestion.caption);
      onOpenChange(false);
      resetState();
    }
  };

  const resetState = () => {
    setSuggestions([]);
    setSelectedSuggestion(null);
    setTopicDescription('');
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            Gerar Legenda com IA
          </DialogTitle>
          <DialogDescription>
            Descreve o tema e escolhe o estilo para gerar sugestões
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Topic Description Input */}
          <div className="space-y-2">
            <Label>Descreve o tema da publicação</Label>
            <Input
              placeholder="Ex: Dicas de produtividade para empreendedores..."
              value={topicDescription}
              onChange={(e) => setTopicDescription(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Tone Selection */}
          <div className="space-y-3">
            <Label>Tom de voz</Label>
            <div className="grid grid-cols-3 gap-3">
              {TONES.map((tone) => {
                const Icon = tone.icon;
                const isSelected = selectedTone === tone.id;
                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setSelectedTone(tone.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all press-effect",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-full transition-colors",
                      isSelected ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <span className={cn(
                      "font-medium text-sm",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {tone.name}
                    </span>
                    <span className="text-xs text-muted-foreground text-center">
                      {tone.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Framework Selection */}
          <div className="space-y-3">
            <Label>Framework de Copywriting</Label>
            <RadioGroup
              value={selectedFramework}
              onValueChange={setSelectedFramework}
              className="space-y-2"
            >
              {FRAMEWORKS.map((fw) => (
                <label
                  key={fw.id}
                  htmlFor={fw.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all press-effect",
                    selectedFramework === fw.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem value={fw.id} id={fw.id} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{fw.icon}</span>
                      <span className="font-medium text-sm">{fw.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{fw.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Original Caption Preview */}
          {currentCaption && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Legenda Original</Label>
              <div className="p-3 rounded-lg bg-muted/30 border text-sm max-h-24 overflow-y-auto">
                {currentCaption}
              </div>
            </div>
          )}

          {/* Generate Button */}
          {suggestions.length === 0 && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || (!currentCaption.trim() && !topicDescription.trim())}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 press-effect"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A gerar 3 sugestões...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar 3 Sugestões
                </>
              )}
            </Button>
          )}

          {/* Suggestions List */}
          {suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-green-600 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {suggestions.length} Sugestões Geradas
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="gap-1.5"
                >
                  <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
                  Regenerar
                </Button>
              </div>

              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    onClick={() => setSelectedSuggestion(suggestion.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 cursor-pointer transition-all press-effect",
                      selectedSuggestion === suggestion.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Sugestão {index + 1}
                      </span>
                      {selectedSuggestion === suggestion.id && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {suggestion.caption}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleApply} 
                  disabled={!selectedSuggestion}
                  className="flex-1 press-effect"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Usar Selecionada
                </Button>
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
