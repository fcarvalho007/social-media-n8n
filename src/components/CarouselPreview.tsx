import { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X, ZoomIn, ChevronLeft, ChevronRight, Download, FileArchive, FileText } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

interface CarouselPreviewProps {
  images: string[];
  template: 'A' | 'B';
  onSelect: () => void;
  isSelected: boolean;
  onRemoveSlide?: (index: number) => void;
  onReorderSlides?: (newOrder: string[]) => void;
  isApproved?: boolean;
  approvedTemplate?: 'A' | 'B' | null;
}

interface SortableThumbProps {
  image: string;
  index: number;
  activeIndex: number;
  onRemove?: () => void;
  canRemove: boolean;
}

function SortableThumb({ image, index, activeIndex, onRemove, canRemove }: SortableThumbProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const getPreviewUrl = (originalUrl: string, width: number = 200, quality: number = 60) => {
    if (!originalUrl.includes('supabase.co/storage') && !originalUrl.includes('vtmrimrrppuclciolzuw')) {
      return originalUrl;
    }
    return `${originalUrl}?width=${width}&quality=${quality}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative aspect-square cursor-grab active:cursor-grabbing overflow-hidden rounded border-2 transition-all group select-none",
        activeIndex === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100",
        isDragging && "opacity-50 scale-105 shadow-2xl ring-2 ring-primary"
      )}
    >
      <img
        src={getPreviewUrl(image)}
        alt={`Thumbnail ${index + 1}`}
        className="h-full w-full object-cover pointer-events-none"
        draggable={false}
      />
      {onRemove && canRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-10 bg-destructive/90 backdrop-blur-sm text-destructive-foreground rounded-full p-1 sm:p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:scale-110 shadow-lg"
          aria-label="Remover slide"
        >
          <X className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      )}
    </div>
  );
}

export const CarouselPreview = ({ images, template, onSelect, isSelected, onRemoveSlide, onReorderSlides, isApproved = false, approvedTemplate = null }: CarouselPreviewProps) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideToRemove, setSlideToRemove] = useState<number | null>(null);
  const [zoomImageIndex, setZoomImageIndex] = useState<number | null>(null);
  const [zoomSwiper, setZoomSwiper] = useState<SwiperType | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorderSlides) {
      const oldIndex = images.indexOf(active.id as string);
      const newIndex = images.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(images, oldIndex, newIndex);
        onReorderSlides(newOrder);
      }
    }
  };

  // Cleanup state when component unmounts to prevent Dialog overlay issues
  useEffect(() => {
    return () => {
      setZoomImageIndex(null);
      setSlideToRemove(null);
    };
  }, []);

  // Helper function to generate optimized preview URLs for Supabase Storage
  const getPreviewUrl = (originalUrl: string, width: number = 800, quality: number = 70) => {
    // Only transform Supabase storage URLs
    if (!originalUrl.includes('supabase.co/storage') && !originalUrl.includes('vtmrimrrppuclciolzuw')) {
      return originalUrl;
    }
    return `${originalUrl}?width=${width}&quality=${quality}`;
  };

  const templateColors = {
    A: { 
      badge: 'bg-[#001f3f] text-[#00d4ff] border border-[#00d4ff]/50 shadow-[0_0_15px_rgba(0,212,255,0.5)]', 
      gradient: 'from-[#001f3f] to-[#00d4ff]',
      description: 'azul tech',
      glow: 'shadow-[0_0_30px_rgba(0,212,255,0.8)]',
      ring: 'ring-[#00d4ff]'
    },
    B: { 
      badge: 'bg-[#7c3aed] text-white border border-[#a78bfa]/50 shadow-[0_0_15px_rgba(124,58,237,0.5)]', 
      gradient: 'from-[#7c3aed] to-[#a78bfa]',
      description: 'purple tech',
      glow: 'shadow-[0_0_30px_rgba(167,139,250,0.8)]',
      ring: 'ring-[#a78bfa]'
    },
  };

  const isThisTemplateApproved = isApproved && approvedTemplate === template;
  const isOtherTemplateApproved = isApproved && approvedTemplate !== null && approvedTemplate !== template;

  const handleDownloadAll = async () => {
    try {
      setDownloading(true);
      const zip = new JSZip();

      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const urlNoQuery = url.split('?')[0];
          const ext = urlNoQuery.includes('.') ? urlNoQuery.split('.').pop() : 'jpg';
          zip.file(`template_${template}_slide_${i + 1}.${ext}`, blob);
        } catch (err) {
          console.error(`Falha ao obter imagem ${i + 1}:`, err);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `carrossel_template_${template}.zip`);
    } catch (e) {
      console.error('Erro ao preparar ZIP:', e);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    // Check PDF generation mode
    try {
      const { PDF_GENERATION_MODE } = await import('@/config/pdf');
      if (PDF_GENERATION_MODE === 'server') {
        console.info('[PDF] Client-side PDF generation disabled in server mode');
        const { toast } = await import('sonner');
        toast.info('Exportação local de PDF está desativada. O PDF é gerado no servidor.');
        return;
      }
      // Mode 'client' or 'both' allows local PDF export
    } catch (e) {
      console.warn('[PDF] Could not load PDF config, skipping client PDF');
      return;
    }

    try {
      setDownloadingPdf(true);
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const img = await createImageBitmap(blob);
          if (i > 0) {
            pdf.addPage();
          }
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const imgRatio = img.width / img.height;
          const pageRatio = pageWidth / pageHeight;
          let finalWidth, finalHeight;
          if (imgRatio > pageRatio) {
            finalHeight = pageHeight;
            finalWidth = pageHeight * imgRatio;
          } else {
            finalWidth = pageWidth;
            finalHeight = pageWidth / imgRatio;
          }
          const x = (pageWidth - finalWidth) / 2;
          const y = (pageHeight - finalHeight) / 2;
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          pdf.addImage(base64, 'JPEG', x, y, finalWidth, finalHeight);
        } catch (err) {
          console.error(`Falha ao adicionar imagem ${i + 1} ao PDF:`, err);
        }
      }
      pdf.save(`carrossel_template_${template}.pdf`);
    } catch (e) {
      console.error('Erro ao gerar PDF:', e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className={cn(
      "rounded-2xl border-2 p-4 md:p-5 transition-all duration-150 relative shadow-sm hover:shadow-md",
      isThisTemplateApproved && `border-4 ${templateColors[template].ring} ${templateColors[template].glow} ring-4 ring-offset-2`,
      isOtherTemplateApproved && "opacity-60 border-border/50",
      !isApproved && isSelected && "border-primary shadow-lg ring-2 ring-primary/20",
      !isApproved && !isSelected && "border-border hover:ring-1 hover:ring-border"
    )}>
      {/* Approved Badge */}
      {isThisTemplateApproved && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
          <Badge className={cn(
            "px-3 py-1 text-xs font-semibold",
            templateColors[template].badge
          )}>
            ✓ Selecionado
          </Badge>
        </div>
      )}

      {/* Not Selected Badge */}
      {isOtherTemplateApproved && (
        <div className="absolute top-2 right-2 z-20">
          <Badge variant="outline" className="bg-muted/80 text-muted-foreground text-xs">
            Não Selecionado
          </Badge>
        </div>
      )}

      <div className="mb-3 md:mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge className={cn(templateColors[template].badge, "text-sm font-bold px-3 py-1")}>
            Template {template}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground tracking-tight">
            {templateColors[template].description}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadAll}
                  className="h-8 gap-1.5 px-2"
                  disabled={downloading || downloadingPdf}
                  aria-label="Exportar imagens em ZIP"
                >
                  <FileArchive className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">ZIP</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportar todas as imagens em arquivo ZIP</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadPdf}
                  className="h-8 gap-1.5 px-2"
                  disabled={downloading || downloadingPdf}
                  aria-label="Exportar como PDF"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">PDF</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportar como documento PDF</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <span className="text-xs font-medium text-muted-foreground ml-1">
            {activeIndex + 1}/{images.length}
          </span>
        </div>
      </div>

      {/* Main carousel */}
      <div className="relative mb-2 sm:mb-3 md:mb-4 overflow-hidden rounded-md sm:rounded-lg bg-muted group/carousel">
        <Swiper
          modules={[Navigation, Pagination, Thumbs]}
          navigation
          pagination={{ clickable: true }}
          thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          className="aspect-[4/5] w-full"
        >
          {images.map((image, index) => (
            <SwiperSlide key={index}>
              <div className="relative h-full w-full cursor-zoom-in" onClick={() => setZoomImageIndex(index)}>
                <img
                  src={getPreviewUrl(image, 800, 70)}
                  alt={`Slide ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/carousel:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-12 h-12 text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Thumbnails with drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={images} strategy={horizontalListSortingStrategy}>
          <div className="mb-3 sm:mb-4 md:mb-5 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9 gap-2">
            {images.map((image, index) => (
              <SortableThumb
                key={image}
                image={image}
                index={index}
                activeIndex={activeIndex}
                onRemove={onRemoveSlide ? () => setSlideToRemove(index) : undefined}
                canRemove={images.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        onClick={onSelect}
        className={cn(
          "w-full h-12 md:h-13 text-base font-semibold touch-target transition-all duration-150",
          isSelected && "bg-primary shadow-sm",
          !isSelected && `bg-gradient-to-r ${templateColors[template].gradient} hover:opacity-90`
        )}
      >
        {isSelected ? '✓ Selecionado' : `Escolher Modelo ${template}`}
      </Button>

      <AlertDialog open={slideToRemove !== null} onOpenChange={() => setSlideToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Slide?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o slide {slideToRemove !== null ? slideToRemove + 1 : ''} de {images.length}?
              <br />
              <strong className="text-foreground mt-2 block">
                O carrossel ficará com {images.length - 1} imagens.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (slideToRemove !== null && onRemoveSlide) {
                  onRemoveSlide(slideToRemove);
                  setSlideToRemove(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover Slide
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Zoom Dialog (simplified and stable) */}
      <TooltipProvider>
        <Dialog open={zoomImageIndex !== null} onOpenChange={() => {
          setZoomImageIndex(null);
        }}>
          <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 bg-black/95 border-none overflow-hidden z-[60]">
            <DialogHeader className="sr-only">
              <DialogTitle>Visualizar imagem do carrossel</DialogTitle>
              <DialogDescription>Use as setas ou botões para navegar</DialogDescription>
            </DialogHeader>
            {zoomImageIndex !== null && (
              <div className="relative w-[98vw] h-[98vh] flex items-center justify-center">
                {/* Counter */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/10 text-white px-4 py-2 rounded-lg border border-white/20 shadow-xl">
                  {(zoomImageIndex + 1)} / {images.length}
                </div>
                {/* Image */}
                <img
                  src={images[zoomImageIndex]}
                  alt={`Slide ${zoomImageIndex + 1} - Zoom`}
                  className="max-w-full max-h-full object-contain"
                />
                {/* Prev */}
                <button
                  className="absolute left-6 top-1/2 -translate-y-1/2 z-50 w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 flex items-center justify-center transition-all duration-200"
                  onClick={() => setZoomImageIndex((prev) => (prev! - 1 + images.length) % images.length)}
                  aria-label="Slide anterior"
                >
                  <ChevronLeft className="h-8 w-8 text-white" />
                </button>
                {/* Next */}
                <button
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-50 w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 flex items-center justify-center transition-all duration-200"
                  onClick={() => setZoomImageIndex((prev) => (prev! + 1) % images.length)}
                  aria-label="Próximo slide"
                >
                  <ChevronRight className="h-8 w-8 text-white" />
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
};
