import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Edit3, 
  Sparkles, 
  LayoutGrid, 
  Video, 
  ImageIcon, 
  HelpCircle,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModeDifferencesModal } from './ModeDifferencesModal';

interface ModeSelectorProps {
  onModeSelect: (mode: 'manual' | 'ia', skipNext?: boolean) => void;
  className?: string;
}

export const ModeSelector = ({ onModeSelect, className }: ModeSelectorProps) => {
  const [showModal, setShowModal] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);

  const handleModeSelection = (mode: 'manual' | 'ia') => {
    if (setAsDefault) {
      localStorage.setItem('preferredCreationMode', mode);
    }
    onModeSelect(mode, setAsDefault);
  };

  return (
    <>
      <div className={cn("space-y-6 animate-slide-up", className)}>
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Como prefere criar a sua publicação?
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Pode optar por controlo total (Manual) ou maior rapidez (Assistido por IA).
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Manual Mode Card */}
          <Card className="border-2 border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 cursor-pointer group">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Edit3 className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="outline" className="font-semibold">
                  Controlo Total
                </Badge>
              </div>
              <CardTitle className="text-xl">Manual</CardTitle>
              <CardDescription className="text-sm">
                Criar publicação passo a passo, com controlo total.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Inserir texto, média e calendário manualmente</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Previews por rede e validações</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Guardar rascunhos e aprovar</span>
                </li>
              </ul>
              <Button 
                size="lg" 
                className="w-full h-12 font-semibold shadow-md hover:shadow-lg transition-all"
                onClick={() => handleModeSelection('manual')}
              >
                Começar em modo Manual
              </Button>
            </CardContent>
          </Card>

          {/* AI Mode Card */}
          <Card className="border-2 border-border hover:border-accent/50 hover:shadow-xl transition-all duration-300 cursor-pointer group">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <Badge variant="outline" className="font-semibold">
                  Rápido
                </Badge>
              </div>
              <CardTitle className="text-xl">Assistido por IA</CardTitle>
              <CardDescription className="text-sm">
                Motor novo de carrosséis, integrado no Hub.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" /><span>Carrossel a partir de texto, link ou PDF</span></li>
                <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" /><span>Revisão e exportação no Hub</span></li>
              </ul>
              <div className="space-y-2">
                <Button asChild size="lg" className="w-full h-12 font-semibold">
                  <Link to="/estudio/carrosseis/novo" onClick={() => handleModeSelection('ia')}><LayoutGrid className="h-5 w-5 mr-2" />Criar carrossel</Link>
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" className="h-11 font-semibold"><Link to="/estudio/carrosseis">Meus carrosséis</Link></Button>
                  <Button asChild variant="outline" className="h-11 font-semibold"><Link to="/estudio/redes-sociais">Da crónica</Link></Button>
                </div>
                <p className="text-sm text-muted-foreground"><Video className="inline h-4 w-4 mr-1" aria-hidden />Stories e <ImageIcon className="inline h-4 w-4 mx-1" aria-hidden />Post individual assistidos: 🚧 Em construção.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Set as Default Option */}
        <div className="flex items-center justify-center space-x-2 mt-6">
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
