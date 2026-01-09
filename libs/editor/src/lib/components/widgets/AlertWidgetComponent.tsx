'use client';

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@nextblock-cms/ui';

const AlertWidgetComponent = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { type, title, message, align, size, textAlign } = node.attrs;

  const alertClasses: { [key: string]: string } = {
    info:         'bg-accent/60 text-accent-foreground border-2 border-accent',
    warning:      'bg-warning/60 text-warning-foreground border-2 border-warning',
    notification: 'bg-muted/60 text-muted-foreground border-2 border-muted-foreground',
    danger:       'bg-destructive/60 text-destructive-foreground border-2 border-destructive',
  };

  const sizeClasses: { [key: string]: string } = {
    'fit-content': 'w-auto',
    'full-width': 'w-full',
  };

  const alignClasses: { [key: string]: string } = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const textAlignClasses: { [key: string]: string } = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <NodeViewWrapper>
      <div
        className={`${alignClasses[align] || 'text-left'} cursor-grab`}
        onClick={() => setIsEditing(true)}
        data-drag-handle
      >
        <div
          className={`inline-block rounded-lg border p-2 m-1 ${alertClasses[type] || alertClasses.info} ${
            sizeClasses[size] || sizeClasses['fit-content']
          } ${textAlignClasses[textAlign] || textAlignClasses.left}`}
        >
          <strong className="font-bold block">{title}</strong>
          <span>{message}</span>
        </div>
      </div>

      {isEditing && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={() => setIsEditing(false)}
        >
          <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Edit Alert</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  type="text"
                  id="title"
                  defaultValue={title}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => updateAttributes({ title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  defaultValue={message}
                  onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => updateAttributes({ message: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select defaultValue={type} onValueChange={(value: string) => updateAttributes({ type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                    <SelectItem value="danger">Danger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="align">Alignment</Label>
                <Select defaultValue={align} onValueChange={(value: string) => updateAttributes({ align: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an alignment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
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

export default AlertWidgetComponent;