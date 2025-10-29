// app/cms/blocks/components/BlockTypeSelector.tsx
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@nextblock-cms/ui";
import { blockRegistry, BlockType } from '@/lib/blocks/blockRegistry';
import BlockTypeCard from './BlockTypeCard';

interface BlockTypeSelectorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectBlockType: (blockType: BlockType) => void;
  allowedBlockTypes?: BlockType[];
}

const BlockTypeSelector: React.FC<BlockTypeSelectorProps> = ({
  isOpen,
  onOpenChange,
  onSelectBlockType,
  allowedBlockTypes,
}) => {
  const handleSelect = (blockType: BlockType) => {
    onSelectBlockType(blockType);
    onOpenChange(false);
  };

  const blockDefs = Object.values(blockRegistry).filter(
    (blockDef) => !allowedBlockTypes || allowedBlockTypes.includes(blockDef.type)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Add a New Block</DialogTitle>
          <DialogDescription>
            Choose a block type from the options below to add it to the page.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
          {blockDefs.map((blockDef) => (
            <BlockTypeCard
              key={blockDef.type}
              name={blockDef.label}
              description={blockDef.documentation?.description}
              icon={blockDef.icon}
              onClick={() => handleSelect(blockDef.type)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockTypeSelector;