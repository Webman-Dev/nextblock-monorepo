"use client";

import { Toaster } from "react-hot-toast";
import { Toaster as SonnerToaster } from "sonner";

// Two toast libraries are in use across the app: react-hot-toast in most of the CMS,
// and sonner in ~19 files (the commerce components, the settings pages, the new
// inbox). Only react-hot-toast was ever mounted, so every sonner toast — including
// "added to cart" — was silently discarded. Mount both rather than rewrite the call
// sites, and keep the two visually aligned.
export function ToasterProvider() {
  return (
    <>
    <SonnerToaster position="top-right" richColors closeButton />
    <Toaster
      position="top-right"
      toastOptions={{
        style: { fontSize: 14 },
        success: { iconTheme: { primary: '#16a34a', secondary: 'white' } },
        error: { iconTheme: { primary: '#dc2626', secondary: 'white' } },
      }}
    />
    </>
  );
}

