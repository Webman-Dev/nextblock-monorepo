"use client";

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
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

// Fallback component for unauthorized users or when TipTap fails to load
const BasicTextEditor = ({ initialContent, onChange, editable = true }: RichTextEditorProps) => (
  <div className="h-full flex flex-col border rounded-md">
    <div className="border-b p-2 bg-muted">
      <span className="text-sm text-muted-foreground">
        Basic text editor
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

// Dynamic import of the RichTextEditor - only loaded when needed
const DynamicRichTextEditor = dynamic(
  () => import('./DynamicRichTextEditor').then((mod) => ({
    default: mod.default
  })),
  {
    ssr: false, // TipTap is client-side only
    loading: () => <RichTextEditorSkeleton />,
  }
);

// Main role-aware component
export default function RoleAwareRichTextEditor(props: RichTextEditorProps) {
  const { isAdmin, isWriter, isLoading } = useAuth();

  // Show loading skeleton while auth is being determined
  if (isLoading) {
    return <RichTextEditorSkeleton />;
  }

  // Only load TipTap for users with ADMIN or WRITER roles
  if (!isAdmin && !isWriter) {
    return <BasicTextEditor {...props} />;
  }

  // For authorized users, load the full TipTap editor
  return (
    <Suspense fallback={<RichTextEditorSkeleton />}>
      <DynamicRichTextEditor {...props} />
    </Suspense>
  );
}

// Export the props interface for use in other components
export type { RichTextEditorProps };