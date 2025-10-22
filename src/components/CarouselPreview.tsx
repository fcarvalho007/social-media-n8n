import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X, ZoomIn } from 'lucide-react';
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
} from '@/components/ui/dialog';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';

interface CarouselPreviewProps {
  images: string[];
  template: 'A' | 'B';
  onSelect: () => void;
  isSelected: boolean;
  onRemoveSlide?: (index: number) => void;
}

export const CarouselPreview = ({ images, template, onSelect, isSelected, onRemoveSlide }: CarouselPreviewProps) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideToRemove, setSlideToRemove] = useState<number | null>(null);
  const [zoomImageIndex, setZoomImageIndex] = useState<number | null>(null);

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
      description: 'Azul Tech'
    },
    B: { 
      badge: 'bg-[#ff4500] text-white border border-[#ff6347]/50 shadow-[0_0_15px_rgba(255,69,0,0.5)]', 
      gradient: 'from-[#ff4500] to-[#ff6347]',
      description: 'Red tech'
    },
  };

  return (
    <div className={cn(
      "rounded-lg sm:rounded-xl border-2 p-3 sm:p-4 md:p-6 transition-all duration-300",
      isSelected ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border"
    )}>
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn(templateColors[template].badge, "text-xs sm:text-sm font-bold")}>
            Template {template}
          </Badge>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            {templateColors[template].description}
          </span>
        </div>
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
          {activeIndex + 1}/{images.length}
        </span>
      </div>

      {/* Main carousel */}
      <div className="relative mb-3 sm:mb-4 overflow-hidden rounded-md sm:rounded-lg bg-muted group/carousel">
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
          320: { slidesPerView: 4, spaceBetween: 6 },
          640: { slidesPerView: 6, spaceBetween: 8 },
          1024: { slidesPerView: 9, spaceBetween: 8 },
        }}
        watchSlidesProgress
        className="mb-4 sm:mb-6"
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
          "w-full h-11 sm:h-14 text-base sm:text-lg font-semibold",
          isSelected ? "bg-primary" : `bg-gradient-to-r ${templateColors[template].gradient}`
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

      <Dialog open={zoomImageIndex !== null} onOpenChange={() => setZoomImageIndex(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 sm:p-4">
          {zoomImageIndex !== null && (
            <div className="flex items-center justify-center w-full h-full">
              <img
                src={images[zoomImageIndex]}
                alt={`Slide ${zoomImageIndex + 1} - Zoom`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
