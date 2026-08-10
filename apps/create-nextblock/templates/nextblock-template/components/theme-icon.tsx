"use client";

import {
  Aperture,
  Atom,
  Blend,
  Brush,
  Cloud,
  Contrast,
  Droplet,
  Feather,
  Flame,
  Gem,
  Ghost,
  Leaf,
  Moon,
  Mountain,
  Palette,
  Rocket,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Curated icon set offered to themes.
 *
 * A fixed map rather than a dynamic lucide lookup: the icon name comes from the
 * database, and importing lucide dynamically by string would either pull the
 * whole icon set into the bundle or break tree-shaking.
 */
export const THEME_ICONS: Record<string, LucideIcon> = {
  Sun,
  Moon,
  Zap,
  Sparkles,
  Palette,
  Flame,
  Droplet,
  Leaf,
  Star,
  Cloud,
  Snowflake,
  Waves,
  Mountain,
  Sunrise,
  Sunset,
  Contrast,
  Blend,
  Brush,
  Aperture,
  Atom,
  Feather,
  Gem,
  Ghost,
  Rocket,
};

export const THEME_ICON_NAMES = Object.keys(THEME_ICONS);

export function ThemeIcon({
  name,
  size = 16,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = THEME_ICONS[name] ?? Palette;
  return <Icon size={size} className={className} />;
}
