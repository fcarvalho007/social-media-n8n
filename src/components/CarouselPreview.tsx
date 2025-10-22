import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X, ZoomIn, ChevronLeft, ChevronRight, Trash2, Keyboard, Download } from 'lucide-react';
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
  isApproved?: boolean;
  approvedTemplate?: 'A' | 'B' | null;
}

export const CarouselPreview = ({ images, template, onSelect, isSelected, onRemoveSlide, isApproved = false, approvedTemplate = null }: CarouselPreviewProps) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideToRemove, setSlideToRemove] = useState<number | null>(null);
  const [zoomImageIndex, setZoomImageIndex] = useState<number | null>(null);
  const [zoomSwiper, setZoomSwiper] = useState<SwiperType | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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
      description: 'purple tech',
      glow: 'shadow-[0_0_30px_rgba(0,212,255,0.8)]',
      ring: 'ring-[#00d4ff]'
    },
    B: { 
      badge: 'bg-[#ff4500] text-white border border-[#ff6347]/50 shadow-[0_0_15px_rgba(255,69,0,0.5)]', 
      gradient: 'from-[#ff4500] to-[#ff6347]',
      description: 'Purple tech',
      glow: 'shadow-[0_0_30px_rgba(255,99,71,0.8)]',
      ring: 'ring-[#ff6347]'
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
    try {
      setDownloadingPdf(true);
      const pdf = new jsPDF();
      
      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const img = await createImageBitmap(blob);
          
          // Add new page for images after the first one
          if (i > 0) {
            pdf.addPage();
          }
          
          // Calculate dimensions to cover the entire page (A4 size) - "cover" logic
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const imgRatio = img.width / img.height;
          const pageRatio = pageWidth / pageHeight;
          
          let finalWidth, finalHeight;
          
          if (imgRatio > pageRatio) {
            // Image is wider proportionally - use page height as base
            finalHeight = pageHeight;
            finalWidth = pageHeight * imgRatio;
          } else {
            // Image is taller proportionally - use page width as base
            finalWidth = pageWidth;
            finalHeight = pageWidth / imgRatio;
          }
          
          // Center the image (may crop edges to fill page)
          const x = (pageWidth - finalWidth) / 2;
          const y = (pageHeight - finalHeight) / 2;
          
          // Convert blob to base64
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
      "rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 md:p-5 transition-all duration-300 relative",
      isThisTemplateApproved && `border-4 ${templateColors[template].ring} ${templateColors[template].glow} ring-4 ring-offset-2`,
      isOtherTemplateApproved && "opacity-60 border-border/50",
      !isApproved && isSelected && "border-primary shadow-lg ring-2 ring-primary/20",
      !isApproved && !isSelected && "border-border"
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

      <div className="mb-2 sm:mb-3 md:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn(templateColors[template].badge, "text-xs sm:text-sm font-bold")}>
            Template {template}
          </Badge>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            {templateColors[template].description}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadAll}
            className="h-8 gap-1.5 text-xs"
            disabled={downloading || downloadingPdf}
            aria-label="Baixar todas as imagens em ZIP"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? 'A preparar...' : '.zip'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadPdf}
            className="h-8 gap-1.5 text-xs"
            disabled={downloading || downloadingPdf}
            aria-label="Baixar todas as imagens em PDF"
          >
            <Download className="h-3.5 w-3.5" />
            {downloadingPdf ? 'A preparar...' : '.pdf'}
          </Button>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
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

      {/* Thumbnails */}
      <Swiper
        modules={[Thumbs]}
        onSwiper={setThumbsSwiper}
        spaceBetween={8}
        slidesPerView="auto"
        breakpoints={{
          320: { slidesPerView: 4, spaceBetween: 4 },
          480: { slidesPerView: 5, spaceBetween: 6 },
          640: { slidesPerView: 6, spaceBetween: 8 },
          1024: { slidesPerView: 9, spaceBetween: 8 },
        }}
        watchSlidesProgress
        className="mb-3 sm:mb-4 md:mb-5"
      >
        {images.map((image, index) => (
          <SwiperSlide key={index}>
            <div className={cn(
              "relative aspect-square cursor-pointer overflow-hidden rounded border-2 transition-all group",
              activeIndex === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
            )}>
              <img
                src={getPreviewUrl(image, 200, 60)}
                alt={`Thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
              {onRemoveSlide && images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSlideToRemove(index);
                  }}
                  className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 z-10 bg-destructive/90 backdrop-blur-sm text-destructive-foreground rounded-full p-1 sm:p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:scale-110 shadow-lg"
                  aria-label="Remover slide"
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <Button
        onClick={onSelect}
        className={cn(
          "w-full h-12 sm:h-13 md:h-14 text-sm sm:text-base md:text-lg font-semibold touch-target",
          isSelected && "bg-primary",
          !isSelected && `bg-gradient-to-r ${templateColors[template].gradient}`
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
