"use client";
import styles from "./AdvancedColorMenu.module.css";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { HexColorPicker } from "react-colorful";

import { Button } from "@nextblock-cms/ui/button";
import { Input } from "@nextblock-cms/ui/input";
import { cn } from "@nextblock-cms/utils";

type Mode = "text" | "highlight";

type ColorState = {
  source: string;
  hex: string;
  rgb: string;
  hsl: string;
  alpha: number;
};

interface AdvancedColorMenuProps {
  editor: Editor;
  className?: string;
  initialMode?: Mode;
}

const DEFAULT_TEXT_COLOR = "#1F2937"; // Slate-800
const DEFAULT_HIGHLIGHT_COLOR = "#FFF7D1";

const HIGHLIGHT_PRESETS = [
  "#FFF7D1",
  "#FFEAE3",
  "#DCFCE7",
  "#DBEAFE"
];

const THEME_COLOR_GROUPS = [
  {
    title: "Brand",
    colors: [
      { label: "Primary", value: "hsl(var(--primary))" },
      { label: "Secondary", value: "hsl(var(--secondary))" },
      { label: "Accent", value: "hsl(var(--accent))" },
      { label: "Ring", value: "hsl(var(--ring))" },
    ],
  },
  {
    title: "Neutrals",
    colors: [
      { label: "Foreground", value: "hsl(var(--foreground))" },
      { label: "Muted", value: "hsl(var(--muted-foreground))" },
      { label: "Background", value: "hsl(var(--background))" },
      { label: "Card", value: "hsl(var(--card))" },
    ],
  },
  {
    title: "States",
    colors: [
      { label: "Warning", value: "hsl(var(--warning))" },
      { label: "Destructive", value: "hsl(var(--destructive))" },
      { label: "Success", value: "hsl(var(--chart-2))" },
      { label: "Info", value: "hsl(var(--chart-5))" },
    ],
  },
  {
    title: "Utility",
    colors: [
      { label: "Secondary FG", value: "hsl(var(--secondary-foreground))" },
      { label: "Accent FG", value: "hsl(var(--accent-foreground))" },
      { label: "Primary FG", value: "hsl(var(--primary-foreground))" },
      { label: "Border", value: "hsl(var(--border))" },
    ],
  },
] as const;

const HEX_PATTERN = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const HEX_INPUT_PATTERN = /^#[0-9a-f]{6}$/i;
const RGB_PATTERN = /^rgba?\((\s*\d{1,3}\s*,){2}\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i;
const HSL_PATTERN = /^hsla?\((\s*\d{1,3}\s*,)(\s*\d{1,3}%\s*,)\s*\d{1,3}%\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i;

function normalizeHex(value: string) {
  const raw = value.replace("#", "").trim();
  if (raw.length === 3 || raw.length === 4) {
    const doubled = raw
      .split("")
      .map((char) => char + char)
      .join("");
    return `#${doubled.toUpperCase()}`;
  }
  if (raw.length === 6 || raw.length === 8) {
    return `#${raw.toUpperCase()}`;
  }
  return value;
}

function hexToRgba(hex: string) {
  const normalized = normalizeHex(hex).replace("#", "");
  if (normalized.length !== 6 && normalized.length !== 8) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const a = normalized.length === 8 ? parseInt(normalized.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((component) => Math.max(0, Math.min(255, Math.round(component)))
      .toString(16)
      .padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function rgbaToHsl(r: number, g: number, b: number, alpha = 1) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }

    h /= 6;
  }

  const hue = Math.round(h * 360);
  const saturation = Math.round(s * 100);
  const lightness = Math.round(l * 100);

  if (alpha !== 1) {
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${round(alpha, 2)})`;
  }

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getComputedRgba(value: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const element = document.createElement("span");
  element.style.color = "";
  element.style.color = value;

  if (!element.style.color) {
    return null;
  }

  element.style.position = "absolute";
  element.style.visibility = "hidden";
  element.style.pointerEvents = "none";
  document.body.appendChild(element);
  const computedColor = getComputedStyle(element).color;
  document.body.removeChild(element);

  const match = computedColor.match(/rgba?\(([^)]+)\)/i);
  if (!match) {
    return null;
  }

  const [r, g, b, a] = match[1]
    .split(",")
    .map((component) => component.trim())
    .map((component, index) => (index === 3 ? parseFloat(component) : parseInt(component, 10)));

  if ([r, g, b].some((component) => Number.isNaN(component))) {
    return null;
  }

  return {
    r,
    g,
    b,
    a: typeof a === "number" && !Number.isNaN(a) ? a : 1,
  };
}

function parseColor(value: string | undefined): ColorState | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (HEX_PATTERN.test(trimmed)) {
    const normalized = normalizeHex(trimmed);
    const rgba = hexToRgba(normalized);
    if (!rgba) {
      return null;
    }

    const sixDigit = `#${normalized.replace("#", "").slice(0, 6)}`;

    return {
      source: normalized,
      hex: sixDigit,
      rgb: rgba.a === 1
        ? `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`
        : `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${round(rgba.a, 2)})`,
      hsl: rgbaToHsl(rgba.r, rgba.g, rgba.b, rgba.a),
      alpha: rgba.a,
    };
  }

  if (RGB_PATTERN.test(trimmed) || HSL_PATTERN.test(trimmed)) {
    const computed = getComputedRgba(trimmed);
    if (!computed) return null;

    return {
      source: trimmed,
      hex: rgbToHex(computed.r, computed.g, computed.b),
      rgb: computed.a === 1
        ? `rgb(${computed.r}, ${computed.g}, ${computed.b})`
        : `rgba(${computed.r}, ${computed.g}, ${computed.b}, ${round(computed.a, 2)})`,
      hsl: rgbaToHsl(computed.r, computed.g, computed.b, computed.a),
      alpha: computed.a,
    };
  }

  const computed = getComputedRgba(trimmed);
  if (!computed) {
    return null;
  }

  return {
    source: trimmed,
    hex: rgbToHex(computed.r, computed.g, computed.b),
    rgb: computed.a === 1
      ? `rgb(${computed.r}, ${computed.g}, ${computed.b})`
      : `rgba(${computed.r}, ${computed.g}, ${computed.b}, ${round(computed.a, 2)})`,
    hsl: rgbaToHsl(computed.r, computed.g, computed.b, computed.a),
    alpha: computed.a,
  };
}

function colorStateFromHex(hex: string): ColorState {
  const rgba = hexToRgba(hex);
  if (rgba) {
    return {
      source: normalizeHex(hex),
      hex: rgbToHex(rgba.r, rgba.g, rgba.b),
      rgb:
        rgba.a === 1
          ? `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`
          : `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${round(rgba.a, 2)})`,
      hsl: rgbaToHsl(rgba.r, rgba.g, rgba.b, rgba.a),
      alpha: rgba.a,
    };
  }
  // Fallback: return a minimally valid state using the normalized hex
  const normalized = normalizeHex(hex);
  return {
    source: normalized,
    hex: normalized.slice(0, 7),
    rgb: "rgb(0, 0, 0)",
    hsl: rgbaToHsl(0, 0, 0, 1),
    alpha: 1,
  };
}

const defaultTextState = parseColor(DEFAULT_TEXT_COLOR) ?? colorStateFromHex(DEFAULT_TEXT_COLOR);
const defaultHighlightState = parseColor(DEFAULT_HIGHLIGHT_COLOR) ?? colorStateFromHex(DEFAULT_HIGHLIGHT_COLOR);

export function AdvancedColorMenu({ editor, className, initialMode = "text" }: AdvancedColorMenuProps) {
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [focusedInput, setFocusedInput] = useState<"hex" | "rgb" | "hsl" | null>(null);
  const [textColor, setTextColor] = useState<ColorState>(defaultTextState);
  const [highlightColor, setHighlightColor] = useState<ColorState>(defaultHighlightState);
  

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  const [hexDraft, setHexDraft] = useState<string>(defaultTextState.hex);
  const [hexInvalid, setHexInvalid] = useState(false);
  const [rgbDraft, setRgbDraft] = useState<string>(defaultTextState.rgb);
  const [rgbInvalid, setRgbInvalid] = useState(false);
  const [hslDraft, setHslDraft] = useState<string>(defaultTextState.hsl);
  const [hslInvalid, setHslInvalid] = useState(false);

  const activeColor = mode === "text" ? textColor : highlightColor;

  useEffect(() => {
    const updateFromSelection = () => {
      if (focusedInput) return;
      const textStyleColor = editor.getAttributes("textStyle").color as string | undefined;
      const highlightColorValue = editor.getAttributes("highlight").color as string | undefined;

      const newTextColor = parseColor(textStyleColor) ?? defaultTextState;
      const newHighlightColor = parseColor(highlightColorValue) ?? defaultHighlightState;

      setTextColor(newTextColor);
      setHighlightColor(newHighlightColor);
      
    };

    updateFromSelection();

    editor.on("selectionUpdate", updateFromSelection);
    editor.on("transaction", updateFromSelection);

    return () => {
      editor.off("selectionUpdate", updateFromSelection);
      editor.off("transaction", updateFromSelection);
    };
  }, [editor, focusedInput, mode]);

  useEffect(() => {
    if (focusedInput !== "hex") setHexDraft(activeColor.hex);
    if (focusedInput !== "rgb") setRgbDraft(activeColor.rgb);
    if (focusedInput !== "hsl") setHslDraft(activeColor.hsl);

    if (focusedInput === null) {
      setHexInvalid(false);
      setRgbInvalid(false);
      setHslInvalid(false);
    }
  }, [activeColor, focusedInput]);

  const applyColor = useCallback(
    (targetMode: Mode, color: ColorState, shouldFocus = true) => {
      const chain = editor.chain();

      if (shouldFocus) {
        chain.focus();
      }

      if (targetMode === "text") {
        setTextColor(color);
        chain.setColor(color.source).run();
      } else {
        setHighlightColor(color);
        chain.setHighlight({ color: color.source }).run();
      }
    },
    [editor, setTextColor, setHighlightColor]
  );

  const handleDebouncedColorApply = useCallback(
    (targetMode: Mode, color: ColorState) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        applyColor(targetMode, color, false);
      }, 300);
    },
    [applyColor]
  );

  const handleWheelChange = useCallback(
    (value: string) => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      const parsed = parseColor(value);
      if (!parsed) {
        return;
      }

      applyColor(mode, parsed, false);
      setHexInvalid(false);
    },
    [applyColor, mode, setHexInvalid]
  );

  const handleThemePick = useCallback(
    (value: string) => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      const parsed = parseColor(value);
      if (!parsed) {
        return;
      }

      applyColor(mode, parsed);
      setHexInvalid(false);
    },
    [applyColor, mode, setHexInvalid]
  );


  return (
    <div
      className={cn(
        "flex w-full sm:w-auto flex-col gap-3 sm:gap-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 rounded-md bg-muted/60 p-1">
          <Button
            type="button"
            variant={mode === "text" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => setMode("text")}
          >
            Text
          </Button>
          <Button
            type="button"
            variant={mode === "highlight" ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => setMode("highlight")}
          >
            Highlight
          </Button>
        </div>
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              if (mode === 'text') {
                editor.chain().focus().unsetColor().run();
              } else {
                editor.chain().focus().unsetHighlight().run();
              }
            }}
          >
            Remove Color
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className={styles.pickerRoot}>
          <HexColorPicker color={activeColor.hex} onChange={handleWheelChange} className={styles.picker} />
        </div>
        <div className="flex w-full flex-col gap-2 text-[11px] sm:w-[150px]">
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">HEX</p>
            <Input
              value={hexDraft}
              onFocus={() => setFocusedInput("hex")}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value;
                setHexDraft(value);
                if (HEX_INPUT_PATTERN.test(value)) {
                  const parsed = parseColor(value);
                  if (parsed) {
                    handleDebouncedColorApply(mode, parsed);
                    setHexInvalid(false);
                  }
                } else {
                  setHexInvalid(true);
                }
              }}
              onBlur={() => {
                setFocusedInput(null);
                if (hexInvalid) {
                  setHexDraft(activeColor.hex);
                  setHexInvalid(false);
                }
              }}
              spellCheck={false}
              className={cn("h-8 w-full text-xs", hexInvalid && "border-destructive focus-visible:ring-destructive")}
            />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">RGB</p>
            <Input
              value={rgbDraft}
              onFocus={() => setFocusedInput("rgb")}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value;
                setRgbDraft(value);
                if (RGB_PATTERN.test(value)) {
                  const parsed = parseColor(value);
                  if (parsed) {
                    handleDebouncedColorApply(mode, parsed);
                    setRgbInvalid(false);
                  }
                } else {
                  setRgbInvalid(true);
                }
              }}
              onBlur={() => {
                setFocusedInput(null);
                if (rgbInvalid) {
                  setRgbDraft(activeColor.rgb);
                  setRgbInvalid(false);
                }
              }}
              spellCheck={false}
              className={cn("h-8 w-full text-xs", rgbInvalid && "border-destructive focus-visible:ring-destructive")}
            />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">HSL</p>
            <Input
              value={hslDraft}
              onFocus={() => setFocusedInput("hsl")}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value;
                setHslDraft(value);
                if (HSL_PATTERN.test(value)) {
                  const parsed = parseColor(value);
                  if (parsed) {
                    handleDebouncedColorApply(mode, parsed);
                    setHslInvalid(false);
                  }
                } else {
                  setHslInvalid(true);
                }
              }}
              onBlur={() => {
                setFocusedInput(null);
                if (hslInvalid) {
                  setHslDraft(activeColor.hsl);
                  setHslInvalid(false);
                }
              }}
              spellCheck={false}
              className={cn("h-8 w-full text-xs", hslInvalid && "border-destructive focus-visible:ring-destructive")}
            />
          </div>
        </div>
      </div>


      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Theme colors</p>
        <div className="space-y-1">
          {THEME_COLOR_GROUPS.map((group) => (
            <div key={group.title} className="flex items-center justify-between gap-2">
              <span className="w-16 shrink-0 text-[11px] font-medium text-muted-foreground/80">{group.title}</span>
              <div className="flex items-center gap-1.5">
                {group.colors.map((token) => (
                  <button
                    key={token.label}
                    type="button"
                    onClick={() => handleThemePick(token.value)}
                    className="h-6 w-6 rounded border border-border bg-background shadow-sm transition hover:border-primary/40 hover:shadow-sm"
                    style={{ background: token.value }}
                    aria-label={`${group.title} color ${token.label}`}
                    title={`${group.title} color ${token.label}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {mode === "highlight" ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Highlight presets</p>
          <div className="flex flex-wrap gap-1.5">
            {HIGHLIGHT_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleThemePick(color)}
                className="flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[11px] shadow-sm transition hover:border-primary/40 hover:shadow-sm"
              >
                <span className="h-3.5 w-3.5 rounded-full border" style={{ background: color }} aria-hidden />
                {color}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

}
