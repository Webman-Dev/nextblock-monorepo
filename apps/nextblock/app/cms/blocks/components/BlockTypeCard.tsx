// app/cms/blocks/components/BlockTypeCard.tsx
import React from 'react';
import {
  FileText,
  Heading,
  Image,
  SquareMousePointer,
  LayoutGrid,
  SquarePlay,
  Columns3,
  LayoutTemplate,
  NotebookPen,
  Package,
  ShoppingBag,
  Star,
  ShoppingCart,
  CreditCard,
  Tag,
  MessageSquareQuote,
  type LucideProps,
} from 'lucide-react';

const iconMap: { [key: string]: React.FC<LucideProps> } = {
  FileText,
  Heading,
  Image,
  SquareMousePointer,
  LayoutGrid,
  SquarePlay,
  Columns3,
  LayoutTemplate,
  NotebookPen,
  ShoppingBag,
  Star,
  ShoppingCart,
  CreditCard,
  Tag,
  MessageSquareQuote,
};

interface BlockTypeCardProps {
  icon?: string | any;
  name: string;
  onClick: () => void;
}

const BlockTypeCard: React.FC<BlockTypeCardProps> = ({ icon, name, onClick }) => {
  const IconComponent = typeof icon === 'string'
    ? (iconMap[icon] || Package)
    : (icon || Package);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center justify-between p-4 rounded-lg border border-border bg-card text-card-foreground text-left transition-all duration-150 ease-in-out hover:border-primary/50 hover:bg-accent/40 hover:shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none"
    >
      <span className="text-sm font-medium leading-none truncate pr-2 text-foreground/90 group-hover:text-foreground">
        {name}
      </span>
      <IconComponent className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
    </button>
  );
};

export default BlockTypeCard;