"use client";

import React from 'react';
import { Label } from "@nextblock-cms/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@nextblock-cms/ui";
import type { SectionBlockContent } from "@/lib/blocks/blockRegistry";
import BackgroundSelector from './BackgroundSelector';

interface SectionConfigPanelProps {
  content: Partial<SectionBlockContent>;
  onChange: (newContent: Partial<SectionBlockContent>) => void;
}

export default function SectionConfigPanel({ content, onChange }: SectionConfigPanelProps) {
  const handleContainerTypeChange = (value: SectionBlockContent['container_type']) => {
    onChange({
      ...content,
      container_type: value
    });
  };

  const handleColumnGapChange = (value: SectionBlockContent['column_gap']) => {
    onChange({
      ...content,
      column_gap: value
    });
  };

  const handleDesktopColumnsChange = (value: string) => {
    const desktopColumns = parseInt(value) as 1 | 2 | 3 | 4;
    const currentBlocks = content.column_blocks || [];
    let newColumnBlocks = [...currentBlocks];

    if (desktopColumns < currentBlocks.length) {
      newColumnBlocks = currentBlocks.slice(0, desktopColumns);
    } else if (desktopColumns > currentBlocks.length) {
      const columnsToAdd = desktopColumns - currentBlocks.length;
      for (let i = 0; i < columnsToAdd; i++) {
        newColumnBlocks.push([{
          block_type: "text",
          content: { html_content: `<p>New Column ${currentBlocks.length + i + 1}</p>` },
          temp_id: `new-${Date.now()}-${i}`
        }]);
      }
    }

    onChange({
      ...content,
      responsive_columns: {
        ...(content.responsive_columns || { mobile: 1, tablet: 2, desktop: 3 }),
        desktop: desktopColumns,
      },
      column_blocks: newColumnBlocks,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Section Configuration</h3>
      </div>
      
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Container Type */}
          <div className="space-y-2">
            <Label htmlFor="container-type">Container Type</Label>
            <Select value={content.container_type} onValueChange={handleContainerTypeChange}>
              <SelectTrigger id="container-type">
                <SelectValue placeholder="Select container type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-width">Full Width</SelectItem>
                <SelectItem value="container">Container</SelectItem>
                <SelectItem value="container-sm">Container Small</SelectItem>
                <SelectItem value="container-lg">Container Large</SelectItem>
                <SelectItem value="container-xl">Container XL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Columns */}
          <div className="space-y-2">
            <Label htmlFor="desktop-columns">Desktop Columns</Label>
            <Select value={content.responsive_columns?.desktop?.toString()} onValueChange={handleDesktopColumnsChange}>
              <SelectTrigger id="desktop-columns">
                <SelectValue placeholder="Select columns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Column</SelectItem>
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
                <SelectItem value="4">4 Columns</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Column Gap */}
          <div className="space-y-2">
            <Label htmlFor="column-gap">Column Gap</Label>
            <Select value={content.column_gap} onValueChange={handleColumnGapChange}>
              <SelectTrigger id="column-gap">
                <SelectValue placeholder="Select gap" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="xl">Extra Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vertical Alignment */}
          <div className="space-y-2">
            <Label htmlFor="vertical-alignment">Vertical Alignment</Label>
            <Select 
              value={content.vertical_alignment || 'start'} 
              onValueChange={(value: any) => onChange({ ...content, vertical_alignment: value })}
            >
              <SelectTrigger id="vertical-alignment">
                <SelectValue placeholder="Select alignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start">Top</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="end">Bottom</SelectItem>
                <SelectItem value="stretch">Stretch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Background Configuration */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Background</h4>
          <BackgroundSelector
            background={content.background || { type: 'none' }}
            onChange={(newBackground) => {
              onChange({
                ...content,
                background: newBackground,
              });
            }}
          />
        </div>
      </>
    </div>
  );
}