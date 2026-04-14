'use client';

import { cn } from '@nextblock-cms/utils';
import { useEffect, useState } from 'react';

interface ProductGalleryProps {
  images?: { url: string; alt?: string }[];
  className?: string;
}

export const ProductGallery = ({ images = [], className }: ProductGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [images]);

  // Fallback if no images provided
  if (!images.length) {
    return (
      <div className={cn("relative aspect-square w-full overflow-hidden rounded-lg bg-secondary", className)}>
        <div className="flex h-full items-center justify-center text-muted-foreground">
          No Image
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-white">
        <img
          src={images[selectedIndex].url}
          alt={images[selectedIndex].alt}
          className="h-full w-full object-cover object-center"
        />
      </div>
      
      {images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative aspect-square w-20 flex-shrink-0 overflow-hidden rounded-md border",
                selectedIndex === index ? "ring-2 ring-primary" : "ring-1 ring-transparent hover:ring-primary/50"
              )}
            >
              <img
                src={image.url}
                alt={image.alt}
                className="h-full w-full object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
