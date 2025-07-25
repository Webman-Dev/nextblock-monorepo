'use client';

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState } from 'react';

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
      <div className={`${alignClasses[align] || 'text-left'}`} onClick={() => setIsEditing(true)}>
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
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Edit Alert</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  defaultValue={title}
                  onBlur={e => updateAttributes({ title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  defaultValue={message}
                  onBlur={e => updateAttributes({ message: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="type"
                  defaultValue={type}
                  onChange={e => updateAttributes({ type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="notification">Notification</option>
                  <option value="danger">Danger</option>
                </select>
              </div>
              <div>
                <label htmlFor="align" className="block text-sm font-medium text-gray-700 mb-1">
                  Alignment
                </label>
                <select
                  id="align"
                  defaultValue={align}
                  onChange={e => updateAttributes({ align: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                  Size
                </label>
                <select
                  id="size"
                  defaultValue={size}
                  onChange={e => updateAttributes({ size: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                >
                  <option value="fit-content">Fit Content</option>
                  <option value="full-width">Full Width</option>
                </select>
              </div>
              <div>
                <label htmlFor="textAlign" className="block text-sm font-medium text-gray-700 mb-1">
                  Text Alignment
                </label>
                <select
                  id="textAlign"
                  defaultValue={textAlign}
                  onChange={e => updateAttributes({ textAlign: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default AlertWidgetComponent;