// app/cms/blocks/components/BlockTypeSelector.tsx
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@nextblock-cms/ui";
import { Search, X, Package } from 'lucide-react';
import { blockRegistry, BlockType } from '../../../../lib/blocks/blockRegistry';
import BlockTypeCard from './BlockTypeCard';

interface BlockTypeSelectorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectBlockType: (blockType: any) => void;
  allowedBlockTypes?: BlockType[];
}

const CATEGORIES = ["All", "Layout", "Content", "Media", "Interactive", "E-commerce", "Custom"];

const getBlockCategory = (type: string, isCustomSlug?: boolean): string => {
  if (isCustomSlug) {
    return 'Custom';
  }
  switch (type) {
    case 'section':
      return 'Layout';
    case 'text':
    case 'heading':
    case 'button':
    case 'testimonial':
      return 'Content';
    case 'image':
    case 'video_embed':
      return 'Media';
    case 'form':
    case 'posts_grid':
      return 'Interactive';
    case 'product_grid':
    case 'featured_product':
    case 'cart':
    case 'checkout':
    case 'product_details':
      return 'E-commerce';
    default:
      return 'Content';
  }
};

const BlockTypeSelector: React.FC<BlockTypeSelectorProps> = ({
  isOpen,
  onOpenChange,
  onSelectBlockType,
  allowedBlockTypes,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('All');
  const [customDefs, setCustomDefs] = React.useState<any[]>([]);

  // Reset state and fetch custom blocks when modal is opened
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveCategory('All');
      
      fetch("/api/custom-blocks/editor-definitions")
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Failed to fetch definitions");
        })
        .then((data) => {
          if (data && data.definitions) {
            setCustomDefs(data.definitions);
          }
        })
        .catch((err) => console.error("Error loading custom blocks for selector:", err));
    }
  }, [isOpen]);

  const handleSelect = (blockType: string) => {
    onSelectBlockType(blockType);
    onOpenChange(false);
  };

  const blockDefs = React.useMemo(() => {
    const coreDefs = Object.values(blockRegistry).filter(
      (blockDef) =>
        !allowedBlockTypes || allowedBlockTypes.includes(blockDef.type)
    );

    const mappedCustomDefs = customDefs.map((def) => ({
      type: def.slug,
      label: def.name,
      icon: "LayoutTemplate",
      initialContent: def.fields.reduce((acc: any, field: any) => {
        acc[field.key] = field.type === "image_r2" ? null : field.type === "db_relation" ? (field.multiple ? [] : null) : "";
        return acc;
      }, {}),
      documentation: {
        description: def.description || "Custom user-defined block layout component.",
        useCases: ["Custom page components"],
      },
    }));

    return [...coreDefs, ...mappedCustomDefs];
  }, [allowedBlockTypes, customDefs]);

  // Memoized filter and search results to prevent re-calculations during key strokes
  const filteredBlockDefs = React.useMemo(() => {
    return blockDefs
      .filter((blockDef) => {
        const isCustom = customDefs.some((d) => d.slug === blockDef.type);
        const category = getBlockCategory(blockDef.type, isCustom);

        // Category Filter
        if (activeCategory !== 'All' && category !== activeCategory) {
          return false;
        }
        // Search Filter
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          const matchesLabel = blockDef.label.toLowerCase().includes(query);
          const matchesDesc = blockDef.documentation?.description?.toLowerCase().includes(query) || false;
          return matchesLabel || matchesDesc;
        }
        return true;
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [blockDefs, searchQuery, activeCategory, customDefs]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col gap-0 p-6 overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle>Add a New Block</DialogTitle>
          <DialogDescription>
            Choose a block type from the options below to add it to the page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 overflow-hidden flex-grow">
          {/* Search and Filters Header */}
          <div className="space-y-3 flex-shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search block types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-sm bg-muted/40 hover:bg-muted/60 focus:bg-background transition-colors duration-150 rounded-lg border-border"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-150"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 pb-3 border-b border-border">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`text-xs py-1 px-3 rounded-full transition-all duration-150 border outline-none ${
                    activeCategory === category
                      ? 'bg-primary text-primary-foreground border-primary font-medium shadow-sm'
                      : 'bg-secondary/40 hover:bg-secondary/80 border-transparent text-muted-foreground'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Area */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto pr-1 py-1 flex-grow">
            <TooltipProvider delayDuration={200}>
              {filteredBlockDefs.map((blockDef) => (
                <Tooltip key={blockDef.type}>
                  <TooltipTrigger asChild>
                    <div>
                      <BlockTypeCard
                        name={blockDef.label}
                        icon={blockDef.icon}
                        onClick={() => handleSelect(blockDef.type)}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="center"
                    className="max-w-[280px] p-3 text-xs bg-popover border border-border shadow-lg rounded-md z-[60]"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground">{blockDef.label}</div>
                      <div className="text-muted-foreground leading-normal">
                        {blockDef.documentation?.description || 'No description available.'}
                      </div>
                      {blockDef.documentation?.useCases && blockDef.documentation.useCases.length > 0 && (
                        <div className="pt-1.5 border-t border-border mt-1.5 text-[10px] text-muted-foreground/80">
                          <span className="font-semibold text-foreground/90">Use cases: </span>
                          {blockDef.documentation.useCases.join(', ')}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>

            {filteredBlockDefs.length === 0 && (
              <div className="col-span-full py-12 text-center flex flex-col items-center justify-center text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-30 animate-pulse" />
                <p className="text-sm font-medium">No block types found</p>
                <p className="text-xs">Adjust your search query or select another category</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockTypeSelector;