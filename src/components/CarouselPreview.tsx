import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';

interface CarouselPreviewProps {
  images: string[];
  template: 'A' | 'B';
  onSelect: () => void;
  isSelected: boolean;
}

export const CarouselPreview = ({ images, template, onSelect, isSelected }: CarouselPreviewProps) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
              "aspect-square cursor-pointer overflow-hidden rounded border-2 transition-all",
              activeIndex === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
            )}>
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
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
    </div>
  );
};
