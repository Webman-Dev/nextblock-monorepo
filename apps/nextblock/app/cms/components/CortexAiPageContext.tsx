"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CortexAiContentType = "page" | "post" | "product";

export type CortexAiPageContext = {
  contentType: CortexAiContentType;
  currentEditor?: {
    blockId?: number | string | null;
    blockType?: string | null;
    field?: string | null;
  };
  entityId: number | string;
  languageId?: number | null;
  slug?: string | null;
  title?: string | null;
  translationGroupId?: string | null;
};

type CortexAiPageContextValue = {
  pageContext: CortexAiPageContext | null;
  setPageContext: (context: CortexAiPageContext | null) => void;
};

const CortexAiPageContextStore = createContext<CortexAiPageContextValue | null>(null);

export function CortexAiPageContextProvider({ children }: { children: React.ReactNode }) {
  const [pageContext, setPageContext] = useState<CortexAiPageContext | null>(null);
  const value = useMemo(() => ({ pageContext, setPageContext }), [pageContext]);

  return (
    <CortexAiPageContextStore.Provider value={value}>
      {children}
    </CortexAiPageContextStore.Provider>
  );
}

export function useCortexAiPageContext() {
  return useContext(CortexAiPageContextStore);
}

export function CortexAiPageContextRegistrar({
  context,
}: {
  context: CortexAiPageContext;
}) {
  const store = useCortexAiPageContext();
  const setPageContext = store?.setPageContext;
  const serializedContext = JSON.stringify(context);

  useEffect(() => {
    setPageContext?.(context);
    return () => setPageContext?.(null);
  }, [serializedContext, setPageContext]);

  return null;
}
