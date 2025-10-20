import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
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

  const templateColors = {
    A: { badge: 'bg-template-a-primary text-white', gradient: 'from-template-a-primary to-template-a-secondary' },
    B: { badge: 'bg-template-b-secondary text-template-b-primary', gradient: 'from-template-b-secondary to-template-b-primary' },
  };

  return (
    <div className={cn(
      "rounded-xl border-2 p-6 transition-all duration-300",
      isSelected ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border"
    )}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={templateColors[template].badge}>
            Template {template}
          </Badge>
          <span className="text-sm font-medium text-muted-foreground">
            {template === 'A' ? 'Roxo/Azul Tech' : 'Preto/Dourado Elegante'}
          </span>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {activeIndex + 1}/{images.length}
        </span>
      </div>

      {/* Main carousel */}
      <div className="relative mb-4 overflow-hidden rounded-lg bg-muted">
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
              <img
                src={image}
                alt={`Slide ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Thumbnails */}
      <Swiper
        modules={[Thumbs]}
        onSwiper={setThumbsSwiper}
        spaceBetween={8}
        slidesPerView={9}
        watchSlidesProgress
        className="mb-6"
      >
        {images.map((image, index) => (
          <SwiperSlide key={index}>
            <div className={cn(
              "relative aspect-square cursor-pointer overflow-hidden rounded border-2 transition-all group",
              activeIndex === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
            )}>
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
              {onRemoveSlide && images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSlideToRemove(index);
                  }}
                  className="absolute top-1 right-1 z-10 bg-destructive/90 backdrop-blur-sm text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:scale-110 shadow-lg"
                  aria-label="Remover slide"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <Button
        onClick={onSelect}
        size="lg"
        className={cn(
          "w-full",
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
    </div>
  );
};
