// libs/editor/src/lib/components/menus/SlashCommandList.tsx
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { CommandItemProps } from '../../extensions/SlashCommandComponent';
import { cn } from '@nextblock-monorepo/utils';

interface SlashCommandListProps {
  items: CommandItemProps[];
  command: (item: CommandItemProps) => void;
}

export interface CommandListRef {
  onKeyDown: ({ event }: { event: React.KeyboardEvent }) => boolean;
}

export const SlashCommandList = forwardRef<CommandListRef, SlashCommandListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="z-50 w-72 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
      {props.items.length > 0 ? (
        props.items.map((item, index) => (
          <button
            key={index}
            className={cn(
              'flex w-full items-center space-x-2 rounded-sm p-2 text-left text-sm',
              index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
            )}
            onClick={() => selectItem(index)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
              {item.icon}
            </div>
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </button>
        ))
      ) : (
        <div className="p-2 text-sm text-muted-foreground">No results</div>
      )}
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';