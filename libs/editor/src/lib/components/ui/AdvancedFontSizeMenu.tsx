"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Button } from "@nextblock-cms/ui/button";
import { Input } from "@nextblock-cms/ui/input";
import { cn } from "@nextblock-cms/utils";
import { Eraser, Type } from "lucide-react";

type Unit = "px" | "pt" | "rem" | "em" | "%";

interface AdvancedFontSizeMenuProps {
  editor: Editor;
  className?: string;
}

type ParsedSize = { value: number; unit: Unit } | null;

const SIZE_UNITS: Unit[] = ["px", "pt", "rem", "em", "%"];

function parseFontSize(input: string | undefined | null): ParsedSize {
  if (!input) return null;
  const trimmed = String(input).trim();
  // Match number + unit (supports decimals); allow % too
  const match = trimmed.match(/^(-?\d*\.?\d+)(px|pt|rem|em|%)$/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase() as Unit;
  if (!Number.isFinite(value)) return null;
  return { value, unit };
}

function formatFontSize(size: ParsedSize): string | null {
  if (!size) return null;
  const { value, unit } = size;
  // Clamp minimal sensible values
  if (unit === "%") {
    return `${Math.max(1, Math.round(value))}%`;
  }
  if (unit === "px" || unit === "pt") {
    return `${Math.max(1, Math.round(value))}${unit}`;
  }
  // em/rem with 2 decimal precision
  const rounded = Math.max(0.01, Math.round(value * 100) / 100);
  return `${rounded}${unit}`;
}

function normalizeSizeToken(token: string): string | null {
  const parsed = parseFontSize(token);
  return parsed ? formatFontSize(parsed) : null;
}

// Attempt to extract font-size values from loaded stylesheets, preferring globals.css
type HeadingSize = { level: 1|2|3|4|5|6; value: string };

function collectHeadingFontSizes(): HeadingSize[] {
  if (typeof document === "undefined") return [];
  const results: HeadingSize[] = [];
  try {
    const sheets = Array.from(document.styleSheets) as CSSStyleSheet[];
    // First pass: gather rules from sheets whose href or ownerNode references globals.css
    const prioritized: CSSStyleSheet[] = [];
    const others: CSSStyleSheet[] = [];
    for (const sheet of sheets) {
      const href = (sheet as any).href as string | null | undefined;
      const ownerNode = (sheet as any).ownerNode as Element | null | undefined;
      const text = `${href || ""} ${ownerNode?.textContent || ""}`.toLowerCase();
      if (text.includes("globals.css")) prioritized.push(sheet); else others.push(sheet);
    }
    const ordered = [...prioritized, ...others];
    // Include h1-h6
    const wantedSelectors = new Set(["h1","h2","h3","h4","h5","h6"]);
    for (const sheet of ordered) {
      let rules: CSSRuleList | null = null;
      try {
        rules = sheet.cssRules;
      } catch {
        // Some cross-origin or constructed stylesheets may be inaccessible
        continue;
      }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if ((rule as CSSStyleRule).style) {
          const style = (rule as CSSStyleRule).style;
          const fs = style.fontSize;
          const selectorText = (rule as CSSStyleRule).selectorText;
          if (fs && selectorText && wantedSelectors.has(selectorText)) {
            const normalized = normalizeSizeToken(fs) ?? fs.trim();
            if (normalized) {
              const level = parseInt(selectorText.replace("h", ""), 10) as 1|2|3|4|5|6;
              results.push({ level, value: normalized });
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }
  // Deduplicate by level (prefer first occurrence from prioritized sheet)
  const map = new Map<number, string>();
  for (const item of results) {
    if (!map.has(item.level)) map.set(item.level, item.value);
  }
  return Array.from(map.entries()).map(([level, value]) => ({ level: level as 1|2|3|4|5|6, value }));
}

function estimatePx(value: string): number {
  if (typeof document === "undefined") return 0;
  try {
    const el = document.createElement("span");
    el.style.position = "absolute";
    el.style.visibility = "hidden";
    el.style.fontSize = value;
    document.body.appendChild(el);
    const px = parseFloat(getComputedStyle(el).fontSize);
    document.body.removeChild(el);
    return Number.isFinite(px) ? px : 0;
  } catch {
    return 0;
  }
}

function getRootFontSizePx(): number {
  if (typeof document === "undefined") return 16;
  try {
    const v = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Number.isFinite(v) && v > 0 ? v : 16;
  } catch {
    return 16;
  }
}

function getSelectionContextFontSizePx(editor: Editor): number {
  try {
    const from = editor.state.selection.from;
    const domAt = editor.view.domAtPos(from);
    const node = (domAt && (domAt.node as Element)) || editor.view.dom;
    const el = node.nodeType === 1 ? (node as Element) : editor.view.dom as Element;
    const v = parseFloat(getComputedStyle(el).fontSize);
    return Number.isFinite(v) && v > 0 ? v : getRootFontSizePx();
  } catch {
    return getRootFontSizePx();
  }
}

function pxFrom(value: number, unit: Unit, editor: Editor): number {
  const rootPx = getRootFontSizePx();
  const ctxPx = getSelectionContextFontSizePx(editor);
  switch (unit) {
    case "px": return value;
    case "pt": return value * (96 / 72);
    case "rem": return value * rootPx;
    case "em": return value * ctxPx;
    case "%": return (value / 100) * ctxPx;
  }
}

function valueFromPx(px: number, unit: Unit, editor: Editor): number {
  const rootPx = getRootFontSizePx();
  const ctxPx = getSelectionContextFontSizePx(editor);
  switch (unit) {
    case "px": return px;
    case "pt": return px * (72 / 96);
    case "rem": return px / rootPx;
    case "em": return px / ctxPx;
    case "%": return (px / ctxPx) * 100;
  }
}

export function AdvancedFontSizeMenu({ editor, className }: AdvancedFontSizeMenuProps) {
  const [headingSuggestions, setHeadingSuggestions] = useState<HeadingSize[]>([]);
  const [focused, setFocused] = useState<"value" | "unit" | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");
  const [draftUnit, setDraftUnit] = useState<Unit>("px");
  const [invalid, setInvalid] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with current selection
  const readSelectionSize = useCallback(() => {
    const current = editor.getAttributes("textStyle").fontSize as string | undefined;
    const parsed = parseFontSize(current);
    if (parsed) {
      setDraftValue(String(parsed.value));
      setDraftUnit(parsed.unit);
      setInvalid(false);
    } else {
      // If a non-numeric size like 'small' is set, compute px to preview
      if (current && typeof current === "string") {
        const px = estimatePx(current);
        if (px > 0 && !focused) {
          setDraftValue(String(Math.round(px)));
          setDraftUnit("px");
          setInvalid(false);
          return;
        }
      }
      // No size set on selection or unknown; keep current draft unless focused
      if (!focused) {
        setDraftValue("");
        setDraftUnit("px");
        setInvalid(false);
      }
    }
  }, [editor, focused]);

  useEffect(() => {
    readSelectionSize();
    const handler = () => readSelectionSize();
    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);
    return () => {
      editor.off("selectionUpdate", handler);
      editor.off("transaction", handler);
    };
  }, [editor, readSelectionSize]);

  // Load preferred suggestions on mount
  useEffect(() => {
    setHeadingSuggestions(collectHeadingFontSizes());
  }, []);

  const applySize = useCallback((sizeString: string, focus = true) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const chain = editor.chain();
      if (focus) chain.focus();
      chain.setFontSize(sizeString).run();
    }, 120);
  }, [editor]);

  const handleInputChange = useCallback((valueRaw: string) => {
    setDraftValue(valueRaw);
    const combined = `${valueRaw}${draftUnit}`;
    const parsed = parseFontSize(combined);
    if (parsed) {
      setInvalid(false);
      const formatted = formatFontSize(parsed);
      if (formatted) applySize(formatted, false);
    } else {
      setInvalid(valueRaw.trim().length > 0);
    }
  }, [draftUnit, applySize]);

  const handleUnitChange = useCallback((unit: Unit) => {
    const prevUnit = draftUnit;
    setDraftUnit(unit);
    let px = 0;
    const num = parseFloat(draftValue);
    if (Number.isFinite(num)) {
      px = pxFrom(num, prevUnit, editor);
    } else {
      // Try to infer from selection’s computed size
      px = getSelectionContextFontSizePx(editor);
    }

    // Convert px to target unit with sensible rounding
    const nextVal = valueFromPx(px, unit, editor);
    let displayVal: string;
    if (unit === "px" || unit === "pt") {
      displayVal = String(Math.round(nextVal));
    } else if (unit === "%") {
      displayVal = String(Math.round(nextVal));
    } else {
      displayVal = String(Math.max(0.01, Math.round(nextVal * 100) / 100));
    }
    setDraftValue(displayVal);

    const formatted = formatFontSize(parseFontSize(`${displayVal}${unit}`));
    if (formatted) applySize(formatted);
  }, [draftUnit, draftValue, editor, applySize]);

  const eraseSize = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    editor.chain().focus().unsetFontSize().run();
    setInvalid(false);
  }, [editor]);

  const step = useMemo(() => {
    if (draftUnit === "px" || draftUnit === "pt") return 1;
    if (draftUnit === "%") return 1;
    return 0.01; // em/rem
  }, [draftUnit]);

  const placeholder = useMemo(() => {
    switch (draftUnit) {
      case "%": return "100";
      case "px": return "16";
      case "pt": return "12";
      case "rem": return "1";
      case "em": return "1";
      default: return "";
    }
  }, [draftUnit]);

  return (
    <div className={cn("space-y-3", className)} onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Font size</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={eraseSize}
          title="Erase font size"
          aria-label="Erase font size"
        >
          <Eraser className="h-3.5 w-3.5 mr-1" />
          Erase
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div className="space-y-1">
          <p className="font-medium text-muted-foreground">Value</p>
          <Input
            type="number"
            inputMode="decimal"
            step={step}
            placeholder={placeholder}
            value={draftValue}
            onFocus={() => setFocused("value")}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e.target.value)}
            onBlur={() => setFocused(null)}
            className={cn("h-9", invalid && "border-destructive focus-visible:ring-destructive")}
            spellCheck={false}
          />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-muted-foreground">Unit</p>
          <div className="flex gap-1">
            <select
              value={draftUnit}
              onChange={(e) => handleUnitChange(e.target.value as Unit)}
              onFocus={() => setFocused("unit")}
              onBlur={() => setFocused(null)}
              className="h-9 w-[84px] rounded-md border border-input bg-background px-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SIZE_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {/* Heading sizes */}
        {headingSuggestions.length > 0 ? (
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Headings</p>
          <div className="grid grid-cols-3 gap-1.5">
              {headingSuggestions.map(({ level, value }) => (
                <button
                  key={`h${level}`}
                  type="button"
                  onClick={() => applySize(value)}
                  className="h-8 w-full rounded-md border bg-background px-2 text-xs font-medium shadow-sm transition hover:border-primary/40 hover:shadow-sm"
                  title={`Apply H${level} (${value})`}
                >
                  {`H${level} (${value})`}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Absolute-size keywords */}
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Keywords</p>
          <div className="grid grid-cols-3 gap-1.5">
            {["xx-small","x-small","small","medium","large","x-large"].map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => applySize(kw)}
                className="h-8 w-full rounded-md border bg-background px-2 text-xs font-medium shadow-sm transition hover:border-primary/40 hover:shadow-sm"
                title={`Apply ${kw}`}
              >
                {kw.replace(/\b\w/g, (m) => m.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancedFontSizeMenu;
