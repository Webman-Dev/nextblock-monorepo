'use client';

import { Button } from '@nextblock-cms/ui';
import { deleteProductAction } from '../actions';
import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeleteProductButtonProps {
  id: string;
  productName: string;
  isIcon?: boolean;
  className?: string;
  redirectTo?: string; // Optional redirect after delete
}

export function DeleteProductButton({ id, productName, isIcon = false, className, redirectTo }: DeleteProductButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation if inside a link
    e.stopPropagation();

    if (window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      startTransition(async () => {
        try {
          await deleteProductAction(id);
          if (redirectTo) {
            router.push(redirectTo);
          }
        } catch (error) {
          console.error('Failed to delete product:', error);
          alert('Failed to delete product. Please try again.');
        }
      });
    }
  };

  if (isIcon) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleDelete} 
        disabled={isPending}
        className={`text-red-500 hover:text-red-600 hover:bg-red-50 ${className}`}
        title="Delete Product"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button 
      variant="destructive" 
      onClick={handleDelete} 
      disabled={isPending}
      className={className}
      type="button"
    >
      {isPending ? 'Deleting...' : 'Delete Product'}
    </Button>
  );
}
