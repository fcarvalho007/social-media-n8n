import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X, ZoomIn, ChevronLeft, ChevronRight, Trash2, Keyboard } from 'lucide-react';
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
  const [zoomSwiper, setZoomSwiper] = useState<SwiperType | null>(null);

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

      {/* Zoom Dialog with Navigation */}
      <TooltipProvider>
        <Dialog open={zoomImageIndex !== null} onOpenChange={() => {
          setZoomImageIndex(null);
          setZoomSwiper(null);
        }}>
          <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 bg-black/98 border-none overflow-hidden">
            {zoomImageIndex !== null && (
              <div className="relative w-full h-[98vh]">
                {/* Header with counter, delete and close */}
                <div className="absolute top-6 left-0 right-0 z-50 flex items-center justify-between px-8">
                  <div className="flex items-center gap-4">
                    <Badge className={cn(
                      templateColors[template].badge, 
                      "text-base font-bold backdrop-blur-md px-4 py-2 shadow-xl"
                    )}>
                      Template {template}
                    </Badge>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20 shadow-xl">
                      <span className="text-white font-semibold text-base">
                        {(zoomSwiper?.activeIndex ?? zoomImageIndex) + 1} / {images.length}
                      </span>
                    </div>
                  </div>
                  
                  {onRemoveSlide && images.length > 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="lg"
                          variant="destructive"
                          className="gap-3 backdrop-blur-md shadow-xl hover:scale-105 transition-transform font-semibold text-base h-12 px-6"
                          onClick={() => {
                            const currentIndex = zoomSwiper?.activeIndex ?? zoomImageIndex;
                            setSlideToRemove(currentIndex);
                            setZoomImageIndex(null);
                          }}
                        >
                          <Trash2 className="h-5 w-5" />
                          Eliminar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Eliminar slide atual do carrossel</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Carousel */}
                <Swiper
                  modules={[Navigation]}
                  navigation={{
                    prevEl: '.zoom-swiper-button-prev',
                    nextEl: '.zoom-swiper-button-next',
                  }}
                  initialSlide={zoomImageIndex}
                  onSwiper={setZoomSwiper}
                  keyboard={{ enabled: true }}
                  className="w-full h-full"
                >
                  {images.map((image, index) => (
                    <SwiperSlide key={index}>
                      <div className="flex items-center justify-center w-full h-full p-20">
                        <img
                          src={image}
                          alt={`Slide ${index + 1} - Zoom`}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>

                {/* Navigation Buttons - Left */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="zoom-swiper-button-prev absolute left-8 top-1/2 -translate-y-1/2 z-50 w-16 h-16 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 hover:scale-110 border-2 border-white/30 flex items-center justify-center transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-2xl group"
                      aria-label="Slide anterior"
                    >
                      <ChevronLeft className="h-8 w-8 text-white group-hover:scale-110 transition-transform" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="flex items-center gap-2">
                      <Keyboard className="h-4 w-4" />
                      Slide anterior (← ou A)
                    </p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Navigation Buttons - Right */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="zoom-swiper-button-next absolute right-8 top-1/2 -translate-y-1/2 z-50 w-16 h-16 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 hover:scale-110 border-2 border-white/30 flex items-center justify-center transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-2xl group"
                      aria-label="Próximo slide"
                    >
                      <ChevronRight className="h-8 w-8 text-white group-hover:scale-110 transition-transform" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="flex items-center gap-2">
                      <Keyboard className="h-4 w-4" />
                      Próximo slide (→ ou D)
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Instructions Footer */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
                  <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-xl">
                    <div className="flex items-center gap-3 text-white/90 text-sm font-medium">
                      <Keyboard className="h-4 w-4" />
                      <span>Use as teclas de setas ou clique nos botões para navegar</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
};
