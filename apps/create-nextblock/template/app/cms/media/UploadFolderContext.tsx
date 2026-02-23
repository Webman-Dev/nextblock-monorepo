"use client";

import React, { createContext, useContext } from "react";

type UploadFolderContextValue = {
  defaultFolder?: string | null;
};

const UploadFolderContext = createContext<UploadFolderContextValue>({ defaultFolder: undefined });

export function UploadFolderProvider({ defaultFolder, children }: { defaultFolder?: string; children: React.ReactNode }) {
  return (
    <UploadFolderContext.Provider value={{ defaultFolder }}>
      {children}
    </UploadFolderContext.Provider>
  );
}

export function useUploadFolder() {
  return useContext(UploadFolderContext);
}

