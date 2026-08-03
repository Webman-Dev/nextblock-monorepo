"use client";

import React, { createContext, useContext } from "react";

const EcommerceActiveContext = createContext<boolean>(false);

export function EcommerceActiveProvider({
  children,
  isActive,
}: {
  children: React.ReactNode;
  isActive: boolean;
}) {
  return (
    <EcommerceActiveContext.Provider value={isActive}>
      {children}
    </EcommerceActiveContext.Provider>
  );
}

/**
 * Whether the premium `ecommerce` package is activated for this install.
 * Defaults to `false` outside the provider so any UI gated on it fails closed.
 */
export function useEcommerceActive() {
  return useContext(EcommerceActiveContext);
}
