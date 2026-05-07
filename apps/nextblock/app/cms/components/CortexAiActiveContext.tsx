"use client";

import React, { createContext, useContext } from "react";

const CortexAiActiveContext = createContext<boolean>(false);

export function CortexAiActiveProvider({
  children,
  isActive,
}: {
  children: React.ReactNode;
  isActive: boolean;
}) {
  return (
    <CortexAiActiveContext.Provider value={isActive}>
      {children}
    </CortexAiActiveContext.Provider>
  );
}

export function useCortexAiActive() {
  return useContext(CortexAiActiveContext);
}
