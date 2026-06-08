"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { DynamicLayoutEngine } from "../../../../components/renderers/DynamicLayoutEngine";

// Module-level cache so every block preview shares a single network request for
// the custom block definitions instead of re-fetching per card.
type EditorDefinition = {
  slug: string;
  name: string;
  description?: string | null;
  fields: any[];
  layout_schema: any;
};

const definitionCache: { definitions: EditorDefinition[]; promise: Promise<EditorDefinition[]> | null } = {
  definitions: [],
  promise: null,
};

function loadCustomBlockDefinitions(): Promise<EditorDefinition[]> {
  if (definitionCache.definitions.length > 0) {
    return Promise.resolve(definitionCache.definitions);
  }
  if (!definitionCache.promise) {
    definitionCache.promise = fetch("/api/custom-blocks/editor-definitions")
      .then((res) => (res.ok ? res.json() : { definitions: [] }))
      .then((data) => {
        definitionCache.definitions = (data?.definitions ?? []) as EditorDefinition[];
        return definitionCache.definitions;
      })
      .catch(() => []);
  }
  return definitionCache.promise;
}

function useCustomBlockDefinition(slug: string) {
  const [definitions, setDefinitions] = useState<EditorDefinition[]>(definitionCache.definitions);
  const [loading, setLoading] = useState(definitionCache.definitions.length === 0);

  useEffect(() => {
    let cancelled = false;
    loadCustomBlockDefinitions().then((defs) => {
      if (!cancelled) {
        setDefinitions(defs);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const definition = useMemo(
    () => definitions.find((def) => def.slug === slug) ?? null,
    [definitions, slug]
  );

  return { definition, loading };
}

// Resolve db_relation field values into records so the preview matches the front
// end (including relation images), mirroring the server-side hydration.
function useResolvedRelations(definition: EditorDefinition | null, content: Record<string, any>) {
  const [resolvedRelations, setResolvedRelations] = useState<Record<string, any>>({});

  const relationSignature = useMemo(() => {
    if (!definition) return "";
    return definition.fields
      .filter((field) => field.type === "db_relation")
      .map((field) => `${field.key}:${JSON.stringify(content?.[field.key] ?? null)}`)
      .join("|");
  }, [definition, content]);

  useEffect(() => {
    if (!definition) return;
    const relationFields = definition.fields.filter((field) => field.type === "db_relation");
    if (relationFields.length === 0) {
      setResolvedRelations({});
      return;
    }

    let cancelled = false;
    (async () => {
      const next: Record<string, any> = {};
      await Promise.all(
        relationFields.map(async (field) => {
          const raw = content?.[field.key];
          const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
          if (values.length === 0) return;

          const params = new URLSearchParams({
            table: field.table,
            valueColumn: field.value_column || "id",
            displayColumn: field.display_column || "title",
            values: values.map(String).join(","),
            limit: String(values.length),
          });

          try {
            const res = await fetch(`/api/custom-blocks/db-relations?${params.toString()}`, {
              cache: "no-store",
            });
            if (!res.ok) return;
            const data = await res.json();
            const items = data?.items ?? [];
            next[field.key] = field.multiple ? items : items[0] ?? null;
          } catch {
            // Leave the relation unresolved; the engine falls back gracefully.
          }
        })
      );

      if (!cancelled) {
        setResolvedRelations(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [definition, relationSignature]);

  return resolvedRelations;
}

export interface CustomBlockEditorPreviewProps {
  blockType: string;
  content: Record<string, any>;
  fallback: React.ReactNode;
}

export function CustomBlockEditorPreview({ blockType, content, fallback }: CustomBlockEditorPreviewProps) {
  const { definition, loading } = useCustomBlockDefinition(blockType);
  const resolvedRelations = useResolvedRelations(definition, content);

  if (!definition) {
    if (loading) {
      return (
        <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading block preview…
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return (
    // pointer-events-none lets clicks fall through to the card so editing still opens.
    <div className="pointer-events-none w-full overflow-hidden">
      <DynamicLayoutEngine
        fields={definition.fields}
        layoutSchema={definition.layout_schema}
        data={{ ...(content || {}), resolved_relations: resolvedRelations }}
      />
    </div>
  );
}
