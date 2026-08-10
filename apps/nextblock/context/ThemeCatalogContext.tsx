"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

/** The switcher-facing shape of a row in `site_themes`. */
export interface ThemeCatalogEntry {
  slug: string;
  name: string;
  /** lucide-react icon name. */
  icon: string;
  colorScheme: "light" | "dark";
}

/**
 * Themes are read once on the server in app/layout.tsx and handed to the client
 * through this context, so the switcher never fetches and never hardcodes a
 * list. Falls back to the palette shipped in libs/ui/src/styles/theme.css when
 * the table is empty or unreachable.
 */
export const FALLBACK_THEME_CATALOG: ThemeCatalogEntry[] = [
  { slug: "light", name: "Light", icon: "Sun", colorScheme: "light" },
  { slug: "dark", name: "Dark", icon: "Moon", colorScheme: "dark" },
  { slug: "vibrant", name: "Vibrant", icon: "Zap", colorScheme: "dark" },
];

const ThemeCatalogContext = createContext<ThemeCatalogEntry[]>(FALLBACK_THEME_CATALOG);

export function ThemeCatalogProvider({
  themes,
  children,
}: {
  themes?: ThemeCatalogEntry[];
  children: ReactNode;
}) {
  const value = useMemo(
    () => (Array.isArray(themes) && themes.length > 0 ? themes : FALLBACK_THEME_CATALOG),
    [themes],
  );
  return <ThemeCatalogContext.Provider value={value}>{children}</ThemeCatalogContext.Provider>;
}

export function useThemeCatalog(): ThemeCatalogEntry[] {
  return useContext(ThemeCatalogContext);
}
