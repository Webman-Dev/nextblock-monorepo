'use client';

import { useEffect } from 'react';
import { useCurrentContent } from '../context/CurrentContentContext';

interface CurrentContentSetterProps {
  id: string | number;
  type: 'page' | 'post' | 'product';
  slug: string;
}

export const CurrentContentSetter = ({ id, type, slug }: CurrentContentSetterProps) => {
  const { setCurrentContent } = useCurrentContent();

  useEffect(() => {
    // Only set if different to avoid potential loops if dependencies are unstable
    setCurrentContent({ id, type, slug });
    
    // Cleanup on unmount
    return () => setCurrentContent({ id: null, type: null, slug: null });
  }, [id, type, slug, setCurrentContent]);

  return null;
};
