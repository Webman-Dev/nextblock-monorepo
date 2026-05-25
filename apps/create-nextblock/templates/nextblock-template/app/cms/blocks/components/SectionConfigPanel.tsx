"use client";

import React from 'react';
import { Label } from "@nextblock-cms/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@nextblock-cms/ui";
import { Checkbox, Input } from "@nextblock-cms/ui";
import { SectionBlockContent } from '../../../../lib/blocks/blockRegistry';
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
    <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4 border-b border-muted/50 pb-2 mb-1">
        <h2 className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">Section Configuration</h2>
      </div>
      
      <div className="space-y-4 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Container Type */}
          <div className="space-y-1.5">
            <Label htmlFor="container-type" className="text-sm font-medium text-gray-700 dark:text-gray-300">Container Type</Label>
            <Select value={content.container_type} onValueChange={handleContainerTypeChange}>
              <SelectTrigger id="container-type" className="h-9 text-sm">
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
          <div className="space-y-1.5">
            <Label htmlFor="desktop-columns" className="text-sm font-medium text-gray-700 dark:text-gray-300">Desktop Columns</Label>
            <Select value={content.responsive_columns?.desktop?.toString()} onValueChange={handleDesktopColumnsChange}>
              <SelectTrigger id="desktop-columns" className="h-9 text-sm">
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
          <div className="space-y-1.5">
            <Label htmlFor="column-gap" className="text-sm font-medium text-gray-700 dark:text-gray-300">Column Gap</Label>
            <Select value={content.column_gap} onValueChange={handleColumnGapChange}>
              <SelectTrigger id="column-gap" className="h-9 text-sm">
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
          <div className="space-y-1.5">
            <Label htmlFor="vertical-alignment" className="text-sm font-medium text-gray-700 dark:text-gray-300">Vertical Alignment</Label>
            <Select 
              value={content.vertical_alignment || 'start'} 
              onValueChange={(value: any) => onChange({ ...content, vertical_alignment: value })}
            >
              <SelectTrigger id="vertical-alignment" className="h-9 text-sm">
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

        {/* Hero & Slider Toggles & Settings in a compact single flex flow */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3 border-t border-muted/50">
          {/* 1. Hero Section */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-hero"
              checked={content.is_hero || false}
              onCheckedChange={(checked) => onChange({ ...content, is_hero: !!checked })}
            />
            <Label htmlFor="is-hero" className="text-sm font-medium cursor-pointer text-gray-700 dark:text-gray-300">
              Hero Section (Prioritized image loading)
            </Label>
          </div>

          {/* 2. Enable Slider */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="slider"
              checked={content.slider || false}
              onCheckedChange={(checked) => onChange({ ...content, slider: !!checked })}
            />
            <Label htmlFor="slider" className="text-sm font-medium cursor-pointer text-gray-700 dark:text-gray-300">
              Enable Slider (Carousel layout)
            </Label>
          </div>

          <div className="h-4 w-px bg-muted/60 hidden md:block" />

          {/* 3. Enable Autoplay */}
          <div className={`flex items-center space-x-2 transition-opacity duration-200 ${!content.slider ? 'opacity-40' : ''}`}>
            <Checkbox
              id="autoplay"
              disabled={!content.slider}
              checked={content.slider && (content.autoplay || false)}
              onCheckedChange={(checked) => onChange({ ...content, autoplay: !!checked })}
              className={!content.slider ? 'cursor-not-allowed' : ''}
            />
            <Label 
              htmlFor="autoplay" 
              className={`text-sm font-medium cursor-pointer ${!content.slider ? 'text-muted-foreground/60 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300'}`}
            >
              Enable Autoplay
            </Label>
          </div>

          {/* 4. Autoplay Interval */}
          <div className={`flex items-center gap-x-2 transition-opacity duration-200 ${(!content.slider || !content.autoplay) ? 'opacity-40' : ''}`}>
            <Label 
              htmlFor="timeframe" 
              className={`text-sm font-medium whitespace-nowrap ${(!content.slider || !content.autoplay) ? 'text-muted-foreground/60 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300'}`}
            >
              Interval:
            </Label>
            <div className="flex items-center space-x-1.5">
              <Input
                id="timeframe"
                type="number"
                min={1}
                disabled={!content.slider || !content.autoplay}
                value={content.timeframe !== undefined ? content.timeframe : 5}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onChange({ ...content, timeframe: isNaN(val) || val <= 0 ? 5 : val });
                }}
                placeholder="5"
                className={`h-9 w-16 text-center text-sm ${(!content.slider || !content.autoplay) ? 'cursor-not-allowed bg-muted/40' : ''}`}
              />
              <span className={`text-sm text-muted-foreground ${(!content.slider || !content.autoplay) ? 'cursor-not-allowed' : ''}`}>
                seconds
              </span>
            </div>
          </div>
        </div>

        {/* Background Configuration */}
        {!content.slider && (
          <div className="space-y-3 pt-3 border-t border-muted/50">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Background</h3>
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
        )}
      </div>
    </div>
  );
}