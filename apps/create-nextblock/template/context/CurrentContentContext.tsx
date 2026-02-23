'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CurrentContent {
  id: string | number | null;
  type: 'page' | 'post' | 'product' | null;
  slug: string | null;
}

interface CurrentContentContextType {
  currentContent: CurrentContent;
  setCurrentContent: (content: CurrentContent) => void;
}

const CurrentContentContext = createContext<CurrentContentContextType | undefined>(undefined);

export const CurrentContentProvider = ({ children }: { children: ReactNode }) => {
  const [currentContent, setCurrentContentState] = useState<CurrentContent>({
    id: null,
    type: null,
    slug: null,
  });

  const setCurrentContent = React.useCallback((content: CurrentContent) => {
    setCurrentContentState(content);
  }, []);

  const value = React.useMemo(() => ({
    currentContent,
    setCurrentContent
  }), [currentContent, setCurrentContent]);

  return (
    <CurrentContentContext.Provider value={value}>
      {children}
    </CurrentContentContext.Provider>
  );
};

export const useCurrentContent = () => {
  const context = useContext(CurrentContentContext);
  if (context === undefined) {
    throw new Error('useCurrentContent must be used within a CurrentContentProvider');
  }
  return context;
};