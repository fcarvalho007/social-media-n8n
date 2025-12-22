import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Grid3x3, Grid2x2, Plus, Sparkles, Star, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CropOption {
  id: string;
  label: string;
  description: string;
  rows: number;
  cols: number;
  icon: React.ReactNode;
  recommended?: boolean;
}

const CROP_OPTIONS: CropOption[] = [
  {
    id: '2x2',
    label: '4 slides',
    description: '2×2 compacto',
    rows: 2,
    cols: 2,
    icon: <Grid2x2 className="h-5 w-5" />,
  },
  {
    id: '2x3',
    label: '6 slides',
    description: '2×3 popular',
    rows: 3,
    cols: 2,
    icon: <LayoutGrid className="h-5 w-5" />,
    recommended: true,
  },
  {
    id: '3x3',
    label: '9 slides',
    description: '3×3 completo',
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
  const [selectedOption, setSelectedOption] = useState<string>('2x3');
  const [showPreview, setShowPreview] = useState(false);
  const [hoveredSlide, setHoveredSlide] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setShowPreview(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowPreview(false);
      setHoveredSlide(null);
    }
  }, [open]);

  const handleCrop = useCallback(() => {
    const option = CROP_OPTIONS.find(o => o.id === selectedOption);
    if (option) {
      onCrop(option.rows, option.cols);
    }
  }, [selectedOption, onCrop]);

  const selectedCropOption = CROP_OPTIONS.find(o => o.id === selectedOption);
  const totalSlides = selectedCropOption ? selectedCropOption.rows * selectedCropOption.cols : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Imagem Gerada
          </DialogTitle>
          <DialogDescription>
            Escolhe como adicionar ao carrossel Instagram
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* iPhone Frame Preview */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative mx-auto w-full max-w-[180px]"
              >
                {/* Phone Frame */}
                <div className="relative bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[2rem] p-1.5 shadow-2xl">
                  {/* Phone Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-black rounded-full z-10" />
                  
                  {/* Screen */}
                  <div className="relative bg-black rounded-[1.5rem] overflow-hidden aspect-[9/16]">
                    {/* Instagram Header */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center px-3">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600" />
                      <div className="ml-2 h-1.5 w-12 bg-white/60 rounded" />
                    </div>
                    
                    {/* Image with Grid Overlay */}
                    <div className="relative w-full h-full flex items-center justify-center bg-muted/10">
                      <div className="relative w-full aspect-[3/4] overflow-hidden">
                        <motion.img
                          src={imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.5 }}
                        />
                        
                        {/* Grid Overlay */}
                        {selectedCropOption && (
                          <motion.div
                            key={selectedOption}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.15 }}
                            className="absolute inset-0 grid"
                            style={{
                              gridTemplateRows: `repeat(${selectedCropOption.rows}, 1fr)`,
                              gridTemplateColumns: `repeat(${selectedCropOption.cols}, 1fr)`,
                            }}
                          >
                            {Array.from({ length: totalSlides }).map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ 
                                  opacity: 1, 
                                  scale: hoveredSlide === i ? 1.05 : 1,
                                  backgroundColor: hoveredSlide === i ? 'rgba(255,255,255,0.15)' : 'transparent'
                                }}
                                transition={{ delay: 0.05 * i, duration: 0.2 }}
                                className={cn(
                                  "border border-white/50 flex items-center justify-center cursor-pointer transition-colors",
                                  hoveredSlide === i && "border-white"
                                )}
                                onMouseEnter={() => setHoveredSlide(i)}
                                onMouseLeave={() => setHoveredSlide(null)}
                              >
                                <span className={cn(
                                  "text-white font-bold drop-shadow-lg transition-all",
                                  hoveredSlide === i ? "text-sm" : "text-[10px]"
                                )}>
                                  {i + 1}
                                </span>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    {/* Instagram Footer */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600" />
                        <div className="flex-1">
                          <div className="h-1.5 w-14 bg-white/70 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Slides indicator */}
                <motion.div 
                  className="mt-3 flex justify-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {Array.from({ length: Math.min(totalSlides, 6) }).map((_, i) => (
                    <motion.div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        i === 0 ? "bg-primary w-3" : "bg-muted-foreground/30"
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.35 + i * 0.05 }}
                    />
                  ))}
                  {totalSlides > 6 && (
                    <span className="text-[10px] text-muted-foreground ml-0.5">+{totalSlides - 6}</span>
                  )}
                </motion.div>
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
                  "relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  selectedOption === option.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-muted hover:border-muted-foreground/30"
                )}
              >
                <RadioGroupItem value={option.id} id={option.id} className="sr-only" />
                {option.recommended && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0 h-4 gap-0.5"
                  >
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Popular
                  </Badge>
                )}
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
              size="lg"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Grid3x3 className="h-4 w-4" />
              )}
              Cortar em {totalSlides} slides (3:4)
            </Button>
            
            <Button
              variant="outline"
              onClick={onAddDirect}
              disabled={isProcessing}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar imagem inteira
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
