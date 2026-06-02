// app/cms/blocks/editors/DynamicCustomBlockEditor.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Label } from "@nextblock-cms/ui";
import { Input } from "@nextblock-cms/ui";
import { Textarea } from "@nextblock-cms/ui";
import { BlockEditorProps } from "../components/BlockEditorModal";
import { DBRelationSelect } from "../../custom-blocks/components/DBRelationSelect";
import { ImageR2Picker } from "../../custom-blocks/components/ImageR2Picker";
import type { CustomBlockField } from "@nextblock-cms/utils";

type CustomBlockDefinitionResponse = {
  id: string;
  slug: string;
  name: string;
  fields: CustomBlockField[];
};

// Fallback raw-JSON editor for block types with no custom definition.
function JsonFallbackEditor({
  content,
  onChange,
}: {
  content: Record<string, any>;
  onChange: (next: any) => void;
}) {
  const [value, setValue] = useState(() => JSON.stringify(content ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(JSON.stringify(content ?? {}, null, 2));
    setError(null);
  }, [content]);

  return (
    <div className="space-y-2 p-4 border rounded-xl bg-card/50">
      <Label htmlFor="custom-block-json-fallback" className="text-xs font-semibold">
        Block Content (JSON)
      </Label>
      <Textarea
        id="custom-block-json-fallback"
        value={value}
        spellCheck={false}
        className="min-h-[320px] font-mono text-xs"
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          try {
            onChange(JSON.parse(next));
            setError(null);
          } catch (parseError) {
            setError(parseError instanceof Error ? parseError.message : "Invalid JSON");
          }
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function DynamicCustomBlockEditor({
  block,
  content,
  onChange,
}: BlockEditorProps<Record<string, any>>) {
  const [definition, setDefinition] = useState<CustomBlockDefinitionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDefinition() {
      try {
        const response = await fetch("/api/custom-blocks/editor-definitions");
        if (response.ok) {
          const payload = await response.json();
          const blockType = block.block_type || (block as any).type;
          const def = payload.definitions?.find((d: any) => d.slug === blockType);
          if (def) {
            setDefinition(def);
          }
        }
      } catch (err) {
        console.error("Failed to load custom block definition for editor:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDefinition();
  }, [block.block_type, (block as any).type]);

  if (loading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading custom block settings...</div>;
  }

  // No matching custom block definition (e.g. a non-custom block type routed
  // here as a fallback). Degrade gracefully to a raw JSON editor instead of an
  // error so content stays editable.
  if (!definition) {
    return <JsonFallbackEditor content={content} onChange={onChange} />;
  }

  const handleFieldChange = (key: string, val: any) => {
    onChange({ ...content, [key]: val });
  };

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-card/50">
      <div className="pb-2 border-b">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{definition.name}</h4>
        <p className="text-xs text-muted-foreground">Custom Block Properties</p>
      </div>

      {definition.fields.map((field) => {
        const fieldVal = content[field.key];
        const fieldId = `custom-block-editor-${definition.slug}-${field.key}`;

        return (
          <div key={field.key} className="space-y-1 pt-2">
            <Label htmlFor={fieldId} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            
            {field.type === "rich-text" ? (
              <Textarea
                id={fieldId}
                value={fieldVal || ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="min-h-24 text-sm"
              />
            ) : field.type === "image_r2" ? (
              <ImageR2Picker
                value={fieldVal && typeof fieldVal === "object" && "url" in fieldVal ? fieldVal : null}
                onChange={(val) => handleFieldChange(field.key, val)}
                accept={field.accept}
                maxBytes={field.max_bytes}
              />
            ) : field.type === "db_relation" ? (
              <DBRelationSelect
                table={field.table}
                value={
                  field.multiple
                    ? Array.isArray(fieldVal) ? fieldVal.map(String) : []
                    : fieldVal ? String(fieldVal) : null
                }
                onChange={(val) => handleFieldChange(field.key, val)}
                multiple={field.multiple}
                displayColumn={field.display_column}
                valueColumn={field.value_column}
                filters={field.filters}
              />
            ) : (
              <Input
                id={fieldId}
                type="text"
                value={fieldVal || ""}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="h-9"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
