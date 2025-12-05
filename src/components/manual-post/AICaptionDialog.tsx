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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, RefreshCw, Check, ArrowRight } from 'lucide-react';

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

export default function AICaptionDialog({
  open,
  onOpenChange,
  currentCaption,
  onApplyCaption,
}: AICaptionDialogProps) {
  const [selectedFramework, setSelectedFramework] = useState('hook');
  const [improvedCaption, setImprovedCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!currentCaption.trim()) {
      toast.error('Escreva uma legenda primeiro');
      return;
    }

    setIsGenerating(true);
    setImprovedCaption('');

    try {
      const { data, error } = await supabase.functions.invoke('improve-caption', {
        body: {
          caption: currentCaption,
          framework: selectedFramework,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.improvedCaption) {
        setImprovedCaption(data.improvedCaption);
        toast.success('Legenda melhorada com sucesso!');
      }
    } catch (error) {
      console.error('Error improving caption:', error);
      toast.error('Erro ao melhorar legenda. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (improvedCaption) {
      onApplyCaption(improvedCaption);
      onOpenChange(false);
      setImprovedCaption('');
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setImprovedCaption('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Melhorar com IA
          </DialogTitle>
          <DialogDescription>
            Selecione um framework de copywriting para otimizar a sua legenda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedFramework === fw.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent/50'
                  }`}
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
          <div className="space-y-2">
            <Label className="text-muted-foreground">Legenda Original</Label>
            <div className="p-3 rounded-lg bg-muted/30 border text-sm max-h-24 overflow-y-auto">
              {currentCaption || <span className="text-muted-foreground italic">Sem legenda</span>}
            </div>
          </div>

          {/* Generate Button */}
          {!improvedCaption && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !currentCaption.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A gerar...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Sugestão
                </>
              )}
            </Button>
          )}

          {/* Improved Caption Result */}
          {improvedCaption && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-green-600 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Legenda Melhorada
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerar
                </Button>
              </div>
              <Textarea
                value={improvedCaption}
                onChange={(e) => setImprovedCaption(e.target.value)}
                className="min-h-[150px] resize-none"
              />
              <div className="flex gap-2">
                <Button onClick={handleApply} className="flex-1">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Aplicar Sugestão
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
