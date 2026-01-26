'use client';

import React, { useState, useRef } from 'react';
import { Label } from '@nextblock-cms/ui';
import { X, GripVertical, Image as ImageIcon } from 'lucide-react';
import MediaPickerDialog from '../../media/components/MediaPickerDialog'; // Assuming this exists or using path from form
import type { Database } from '@nextblock-cms/db';
import Image from 'next/image';

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || '';

type MediaItem = {
  id: string; // This is the product_media ID, or temp ID
  media_id: string;
  file_path: string;
  alt: string;
  sort_order: number;
  isNew?: boolean; // If true, needs to be linked
  isDeleted?: boolean; // If true, needs to be unlinked
};

interface ProductMediaManagerProps {
  initialMedia: MediaItem[];
  onUpdate: (media: MediaItem[]) => void;
}

export const ProductMediaManager = ({ initialMedia, onUpdate }: ProductMediaManagerProps) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initialMedia);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = "move"; // Set drag effect
    // Optional: set a drag image or ghost
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
    e.preventDefault();
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
     e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const copyListItems = [...mediaItems];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    // Update sort orders
    const updatedItems = copyListItems.map((item, index) => ({
        ...item,
        sort_order: index
    }));
    
    setMediaItems(updatedItems);
    onUpdate(updatedItems);
  };

  const addMedia = (selectedMedia: Database['public']['Tables']['media']['Row']) => {
      if (!selectedMedia) return;
      
      const newItem: MediaItem = {
          id: `temp-${Date.now()}`, // Temp ID
          media_id: selectedMedia.id,
          file_path: selectedMedia.file_path || selectedMedia.object_key,
          alt: selectedMedia.description || selectedMedia.file_name || '',
          sort_order: mediaItems.length,
          isNew: true
      };
      
      const newItems = [...mediaItems, newItem];
      setMediaItems(newItems);
      onUpdate(newItems);
  };

  const removeMedia = (index: number) => {
      const newItems = mediaItems.filter((_, i) => i !== index);
       // Re-calculate sort orders
      const reordered = newItems.map((item, idx) => ({ ...item, sort_order: idx }));
      setMediaItems(reordered);
      onUpdate(reordered);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
          <Label>Product Gallery</Label>
          <MediaPickerDialog 
            onSelect={addMedia} 
            triggerLabel="+ Add Image"
            triggerVariant="outline"
            defaultFolder="uploads/products/"
          />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {mediaItems.map((item, index) => (
          <div
            key={item.id} // Use unique ID
            className="group relative aspect-square bg-muted/40 rounded-lg border overflow-hidden cursor-move transition-all hover:shadow-md"
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
             {/* Main Image Indicator */}
             {index === 0 && (
                <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    MAIN
                </div>
             )}

            {/* Remove Button */}
            <button
                type="button"
                onClick={() => removeMedia(index)}
                className="absolute top-1 right-1 z-20 p-1 bg-destructive/90 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X className="w-3 h-3" />
            </button>

             {/* Drag Handle Overlay (optional visual cue) */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
            
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <GripVertical className="w-4 h-4 text-white drop-shadow-md" />
            </div>

            <Image
              src={item.file_path.startsWith('http') ? item.file_path : `${R2_BASE_URL}/${item.file_path}`}
              alt={item.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </div>
        ))}

        {mediaItems.length === 0 && (
             <div className="col-span-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/10 text-muted-foreground my-2">
                 <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                 <p className="text-sm">No images added</p>
                 <p className="text-xs opacity-70">Add images to create a gallery</p>
             </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Drag and drop images to reorder. The first image will be used as the main product image.
      </p>
    </div>
  );
};
