import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Edit3, 
  Sparkles, 
  HelpCircle,
  Check,
  Layers,
  Images,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModeDifferencesModal } from './ModeDifferencesModal';
import { AssistedFormatActions } from './ActionButtons';
import { Link } from 'react-router-dom';

interface ModeSelectorProps {
  onModeSelect: (mode: 'manual' | 'ia', skipNext?: boolean) => void;
  className?: string;
}

export const ModeSelector = ({ onModeSelect, className }: ModeSelectorProps) => {
  const [showModal, setShowModal] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [preferredMode, setPreferredMode] = useState<'manual' | 'ia' | null>(() => {
    const stored = localStorage.getItem('preferredCreationMode');
    return stored === 'manual' || stored === 'ia' ? stored : null;
  });

  const handleModeSelection = (mode: 'manual' | 'ia') => {
    if (setAsDefault) {
      localStorage.setItem('preferredCreationMode', mode);
      setPreferredMode(mode);
    }
    onModeSelect(mode, setAsDefault);
  };

  return (
    <>
      <div className={cn("space-y-5 animate-slide-up", className)}>
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Como prefere criar a sua publicação?
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Escolha o ponto de partida. Pode rever e ajustar tudo antes de publicar.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(true)}
            className="text-primary hover:text-primary/80 font-semibold"
          >
            <HelpCircle className="h-4 w-4 mr-1.5" />
            Como funciona?
          </Button>
        </div>

        {/* Mode Cards */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Manual Mode Card */}
          <Card className="group border border-border shadow-sm transition-colors hover:border-primary/50">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Edit3 className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="outline" className="font-semibold">
                  {preferredMode === 'manual' ? 'Predefinido' : 'Controlo total'}
                </Badge>
              </div>
              <CardTitle className="text-xl">Criar manualmente</CardTitle>
              <CardDescription className="text-sm">
                Prepare uma publicação diretamente para as redes sociais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Escolher redes, imagens, vídeo e legenda</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Pré-visualizar e validar cada formato</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Guardar, agendar ou publicar</span>
                </li>
              </ul>
              <Button 
                size="lg" 
                className="w-full h-12 font-semibold shadow-md hover:shadow-lg transition-all"
                onClick={() => handleModeSelection('manual')}
              >
                Criar manualmente
              </Button>
            </CardContent>
          </Card>

          {/* AI Mode Card */}
          <Card className="group border border-primary/30 shadow-sm transition-colors hover:border-primary/60">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="outline" className="font-semibold">
                  {preferredMode === 'ia' ? 'Predefinido' : 'Compositor visual'}
                </Badge>
              </div>
              <CardTitle className="text-xl">Criar com assistência de IA</CardTitle>
              <CardDescription className="text-sm">
                Transforme texto, ligação, PDF ou notícia num conteúdo visual editável.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <AssistedFormatActions onChoose={() => handleModeSelection('ia')} />
                <div className="flex flex-wrap gap-1">
                  <Button asChild variant="ghost" size="sm"><Link to="/estudio/carrosseis"><Layers aria-hidden />Meus carrosséis</Link></Button>
                  <Button asChild variant="ghost" size="sm"><Link to="/estudio/redes-sociais"><Images aria-hidden />Carrosséis da crónica</Link></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Set as Default Option */}
        <div className="flex items-center justify-center space-x-2 pt-1">
          <Checkbox 
            id="default-mode" 
            checked={setAsDefault}
            onCheckedChange={(checked) => setSetAsDefault(checked as boolean)}
          />
          <Label 
            htmlFor="default-mode" 
            className="text-sm font-medium cursor-pointer"
          >
            Definir como predefinição
          </Label>
        </div>
      </div>

      <ModeDifferencesModal 
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
};
