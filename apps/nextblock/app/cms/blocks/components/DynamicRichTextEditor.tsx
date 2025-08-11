"use client";

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@nextblock-monorepo/ui';

// Define the props interface for type safety
interface RichTextEditorProps {
  initialContent: string;
  onChange: (htmlContent: string) => void;
  editable?: boolean;
}

// Loading component for the rich text editor
const RichTextEditorSkeleton = () => (
  <div className="h-full flex flex-col border rounded-md">
    {/* MenuBar skeleton */}
    <div className="border-b p-2 flex gap-2">
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
      <div className="w-px bg-border mx-2" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-8 w-8" />
      <div className="w-px bg-border mx-2" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-16" />
    </div>
    {/* Editor content skeleton */}
    <div className="flex-1 p-4 space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  </div>
);

// Error boundary component for TipTap loading failures
class TipTapErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TipTap loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Fallback component when TipTap fails to load
const TipTapFallback = ({ initialContent, onChange, editable = true }: RichTextEditorProps) => (
  <div className="h-full flex flex-col border rounded-md">
    <div className="border-b p-2 bg-muted">
      <span className="text-sm text-muted-foreground">
        Rich text editor unavailable - using basic text editor
      </span>
    </div>
    <textarea
      value={initialContent.replace(/<[^>]*>/g, '')} // Strip HTML tags for fallback
      onChange={(e) => onChange(`<p>${e.target.value}</p>`)} // Wrap in paragraph tags
      className="flex-1 p-4 resize-none border-0 focus:outline-none bg-background"
      disabled={!editable}
      placeholder="Enter your content here..."
    />
  </div>
);

// Dynamic import of the RichTextEditor with proper chunk naming
const RichTextEditor = dynamic(
  () => import('./RichTextEditor.js').then((mod) => mod.default),
  {
    ssr: false, // TipTap is client-side only
    loading: () => <RichTextEditorSkeleton />,
  }
);

// Main dynamic wrapper component
export default function DynamicRichTextEditor(props: RichTextEditorProps) {
  return (
    <TipTapErrorBoundary fallback={<TipTapFallback {...props} />}>
      <Suspense fallback={<RichTextEditorSkeleton />}>
        <RichTextEditor {...props} />
      </Suspense>
    </TipTapErrorBoundary>
  );
}

// Export the props interface for use in other components
export type { RichTextEditorProps };