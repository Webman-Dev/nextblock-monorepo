import React from 'react';
import { cn } from '@nextblock-cms/utils';

export const Toolbar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center gap-1 rounded-md bg-background p-1',
      className
    )}
    {...props}
  />
));
Toolbar.displayName = 'Toolbar';

export const ToolbarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center gap-1', className)} {...props} />
));
ToolbarGroup.displayName = 'ToolbarGroup';

export const ToolbarButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { isActive?: boolean }>(({ className, isActive, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md p-1.5 text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      { 'bg-accent text-accent-foreground': isActive },
      className
    )}
    {...props}
  />
));
ToolbarButton.displayName = 'ToolbarButton';

export const ToolbarSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mx-1 h-7 w-px bg-muted', className)} {...props} />
));
ToolbarSeparator.displayName = 'ToolbarSeparator';