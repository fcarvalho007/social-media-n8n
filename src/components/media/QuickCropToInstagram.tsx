import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Grid3x3, Grid2x2, Plus, Sparkles, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CropOption {
  id: string;
  label: string;
  description: string;
  rows: number;
  cols: number;
  icon: React.ReactNode;
}

const CROP_OPTIONS: CropOption[] = [
  {
    id: '2x2',
    label: '4 slides (2×2)',
    description: 'Grid compacto',
    rows: 2,
    cols: 2,
    icon: <Grid2x2 className="h-5 w-5" />,
  },
  {
    id: '3x2',
    label: '6 slides (3×2)',
    description: 'Formato médio',
    rows: 3,
    cols: 2,
    icon: <Grid3x3 className="h-5 w-5" />,
  },
  {
    id: '3x3',
    label: '9 slides (3×3)',
    description: 'Grid completo',
    rows: 3,
    cols: 3,
    icon: <Grid3x3 className="h-5 w-5" />,
  },
];

interface QuickCropToInstagramProps {
  imageUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCrop: (rows: number, cols: number) => void;
  onAddDirect: () => void;
  isProcessing?: boolean;
}

export function QuickCropToInstagram({
  imageUrl,
  open,
  onOpenChange,
  onCrop,
  onAddDirect,
  isProcessing = false,
}: QuickCropToInstagramProps) {
  const [selectedOption, setSelectedOption] = useState<string>('2x2');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open) {
      // Small delay for animation
      const timer = setTimeout(() => setShowPreview(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowPreview(false);
    }
  }, [open]);

  const handleCrop = useCallback(() => {
    const option = CROP_OPTIONS.find(o => o.id === selectedOption);
    if (option) {
      onCrop(option.rows, option.cols);
    }
  }, [selectedOption, onCrop]);

  const selectedCropOption = CROP_OPTIONS.find(o => o.id === selectedOption);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Imagem Gerada
          </DialogTitle>
          <DialogDescription>
            Escolhe como adicionar ao carrossel
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* iPhone Frame Preview */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="relative mx-auto w-full max-w-[200px]"
              >
                {/* Phone Frame */}
                <div className="relative bg-gradient-to-b from-muted to-muted/80 rounded-[2rem] p-2 shadow-xl">
                  {/* Phone Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-black rounded-full z-10" />
                  
                  {/* Screen */}
                  <div className="relative bg-black rounded-[1.5rem] overflow-hidden aspect-[9/16]">
                    {/* Image with Grid Overlay */}
                    <div className="relative w-full h-full flex items-center justify-center bg-muted/20">
                      <div className="relative w-full aspect-[3/4] overflow-hidden">
                        <img
                          src={imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Grid Overlay */}
                        {selectedCropOption && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="absolute inset-0 grid"
                            style={{
                              gridTemplateRows: `repeat(${selectedCropOption.rows}, 1fr)`,
                              gridTemplateColumns: `repeat(${selectedCropOption.cols}, 1fr)`,
                            }}
                          >
                            {Array.from({ length: selectedCropOption.rows * selectedCropOption.cols }).map((_, i) => (
                              <div
                                key={i}
                                className="border border-white/40 flex items-center justify-center"
                              >
                                <span className="text-white/80 text-xs font-bold drop-shadow-lg">
                                  {i + 1}
                                </span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    {/* Instagram UI Elements */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600" />
                        <div className="flex-1">
                          <div className="h-2 w-16 bg-white/80 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Slides indicator */}
                <div className="mt-2 flex justify-center gap-1">
                  {selectedCropOption && Array.from({ length: Math.min(selectedCropOption.rows * selectedCropOption.cols, 5) }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        i === 0 ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    />
                  ))}
                  {selectedCropOption && selectedCropOption.rows * selectedCropOption.cols > 5 && (
                    <span className="text-xs text-muted-foreground">+{selectedCropOption.rows * selectedCropOption.cols - 5}</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Crop Options */}
          <RadioGroup
            value={selectedOption}
            onValueChange={setSelectedOption}
            className="grid grid-cols-3 gap-2"
          >
            {CROP_OPTIONS.map((option) => (
              <Label
                key={option.id}
                htmlFor={option.id}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  selectedOption === option.id
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                )}
              >
                <RadioGroupItem value={option.id} id={option.id} className="sr-only" />
                {option.icon}
                <span className="text-xs font-medium">{option.label}</span>
                <span className="text-[10px] text-muted-foreground">{option.description}</span>
              </Label>
            ))}
          </RadioGroup>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleCrop}
              disabled={isProcessing}
              className="w-full gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Grid3x3 className="h-4 w-4" />
              )}
              Cortar em {selectedCropOption?.rows}×{selectedCropOption?.cols} (3:4)
            </Button>
            
            <Button
              variant="outline"
              onClick={onAddDirect}
              disabled={isProcessing}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar sem cortar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
