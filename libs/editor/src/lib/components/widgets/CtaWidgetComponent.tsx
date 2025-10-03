'use client';

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nextblock-cms/ui';

const CtaWidgetComponent = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { text, url, style, size, textAlign } = node.attrs;

  const buttonClasses: { [key: string]: string } = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  };

  const sizeClasses: { [key: string]: string } = {
    'fit-content': 'w-auto',
    'full-width': 'w-full',
  };

  const textAlignClasses: { [key: string]: string } = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <NodeViewWrapper>
      <div
        className={`p-2 ${textAlignClasses[textAlign] || textAlignClasses.left} cursor-grab`}
        data-drag-handle
        onClick={() => setIsEditing(true)}
      >
        <div
          role="button"
          tabIndex={0}
          className={`inline-block px-4 py-2 rounded-md ${buttonClasses[style]} ${
            sizeClasses[size] || sizeClasses['fit-content']
          }`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsEditing(true);
            }
          }}
        >
          {text}
        </div>
      </div>

      {isEditing && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={() => setIsEditing(false)}
        >
          <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Edit CTA Button</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="text">Button Text</Label>
                <Input
                  type="text"
                  id="text"
                  defaultValue={text}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateAttributes({ text: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  type="text"
                  id="url"
                  defaultValue={url}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateAttributes({ url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="style">Style</Label>
                <Select defaultValue={style} onValueChange={(value: string) => updateAttributes({ style: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="size">Size</Label>
                <Select defaultValue={size} onValueChange={(value: string) => updateAttributes({ size: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit-content">Fit Content</SelectItem>
                    <SelectItem value="full-width">Full Width</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="textAlign">Text Alignment</Label>
                <Select defaultValue={textAlign} onValueChange={(value: string) => updateAttributes({ textAlign: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a text alignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setIsEditing(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default CtaWidgetComponent;