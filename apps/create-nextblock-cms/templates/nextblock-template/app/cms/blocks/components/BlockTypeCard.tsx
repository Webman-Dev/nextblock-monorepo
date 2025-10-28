// app/cms/blocks/components/BlockTypeCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@nextblock-cms/ui";
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
};

interface BlockTypeCardProps {
  icon?: string;
  name: string;
  description?: string;
  onClick: () => void;
}

const BlockTypeCard: React.FC<BlockTypeCardProps> = ({ icon, name, description, onClick }) => {
  const IconComponent = icon && iconMap[icon] ? iconMap[icon] : Package;

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-lg hover:border-primary transition-all duration-200 ease-in-out"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
        {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {description || 'No description available.'}
        </p>
      </CardContent>
    </Card>
  );
};

export default BlockTypeCard;