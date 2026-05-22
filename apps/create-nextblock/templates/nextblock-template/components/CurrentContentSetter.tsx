'use client';

import { useEffect } from 'react';
import { useCurrentContent } from '../context/CurrentContentContext';

interface CurrentContentSetterProps {
  id: string | number | null;
  type: 'page' | 'post' | 'product' | null;
  slug: string | null;
  translation_group_id?: string | null;
}

export const CurrentContentSetter = ({ id, type, slug, translation_group_id }: CurrentContentSetterProps) => {
  const { setCurrentContent } = useCurrentContent();

  useEffect(() => {
    // Only set if different to avoid potential loops if dependencies are unstable
    setCurrentContent({ id, type, slug, translation_group_id });
    
    // Cleanup on unmount
    return () => setCurrentContent({ id: null, type: null, slug: null, translation_group_id: null });
  }, [id, type, slug, translation_group_id, setCurrentContent]);

  return null;
};
