"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  Boxes,
  Plus,
  Trash2,
  Settings,
  Database,
  ImageIcon,
  Type,
  Code,
  ArrowLeft,
  Save,
  PlusCircle,
  Eye,
  ListTree,
  ChevronDown,
  ChevronRight,
  Info,
  FolderOpen,
  Sparkles,
  Layers,
  Loader2,
  GripVertical,
  BookOpen,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Label,
  Textarea,
  Checkbox,
  ConfirmationDialog,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@nextblock-cms/ui";
import { DynamicLayoutEngine } from "../../../../components/renderers/DynamicLayoutEngine";
import { ImageR2Picker } from "./ImageR2Picker";
import { DBRelationSelect } from "./DBRelationSelect";
import {
  createCustomBlockDefinition,
  updateCustomBlockDefinition,
} from "../actions";
import { orderCustomBlockFieldsByLayout } from "@nextblock-cms/utils";
import type { CustomBlockDefinition, CustomBlockField } from "@nextblock-cms/utils";

// Allowed container and field tags
const CONTAINER_TAGS = ["div", "section", "article", "blockquote", "figure", "figcaption", "h2", "h3", "p", "span"];
const FIELD_TAGS = ["div", "span", "p", "blockquote", "img", "h2", "h3", "figcaption"];

const getFieldIcon = (type: string) => {
  switch (type) {
    case "text":
      return <Type className="h-3 w-3 text-sky-500 shrink-0" />;
    case "rich-text":
      return <Code className="h-3 w-3 text-emerald-500 shrink-0" />;
    case "image_r2":
      return <ImageIcon className="h-3 w-3 text-amber-500 shrink-0" />;
    case "db_relation":
      return <Database className="h-3 w-3 text-violet-500 shrink-0" />;
    default:
      return <Info className="h-3 w-3 text-slate-500 shrink-0" />;
  }
};

interface BlockComposerProps {
  initialData?: CustomBlockDefinition;
  mode: "create" | "edit";
}

interface RelationTableTarget {
  table: string;
  label: string;
  displayColumn: string;
  valueColumn: string;
  valueType: string;
  selectColumns?: string[];
}

export function BlockComposer({ initialData, mode }: BlockComposerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // General Block Info
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  // Provenance flag: true for newly authored blocks, preserved on edit, set to
  // false automatically by the duplicate action. No longer user-editable.
  const [isOriginal] = useState(initialData?.is_original !== false);

  // Schema state
  const [fields, setFields] = useState<CustomBlockField[]>(initialData?.fields || []);
  const [layoutSchema, setLayoutSchema] = useState<any>(
    initialData?.layout_schema || {
      type: "container",
      as: "div",
      className: "rounded-xl border bg-card p-6 shadow-sm flex flex-col gap-4",
      children: [],
    }
  );

  // Active designer view states
  const [activeTab, setActiveTab] = useState<"general" | "fields" | "layout">("general");
  const [relationTables, setRelationTables] = useState<RelationTableTarget[]>([]);
  const [selectedNodePath, setSelectedNodePath] = useState<number[] | null>(null);
  
  // Drag and drop state
  const [draggedPath, setDraggedPath] = useState<number[] | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ path: number[]; position: "before" | "after" | "inside" } | null>(null);
  
  // Real-time mockup values for preview form
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [mockRelationRecords, setMockRelationRecords] = useState<Record<string, any>>({});

  // Tree helper expanded state
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({ "[]": true });

  // Fetch available table relations on load
  useEffect(() => {
    const fetchRelations = async () => {
      try {
        const res = await fetch("/api/custom-blocks/db-relations?mode=tables");
        if (res.ok) {
          const data = await res.json();
          if (data && data.tables) {
            setRelationTables(data.tables);
          }
        }
      } catch (err) {
        console.error("Error loading relation target tables:", err);
      }
    };
    fetchRelations();
  }, []);

  // Sync previews whenever fields list changes
  useEffect(() => {
    const freshMock: Record<string, any> = { ...previewValues };
    const freshRelations: Record<string, any> = { ...mockRelationRecords };
    
    fields.forEach((f) => {
      if (freshMock[f.key] === undefined) {
        if (f.type === "text") freshMock[f.key] = `Mock text value for ${f.key}`;
        if (f.type === "rich-text") freshMock[f.key] = `<p>Mock <strong>Rich Text</strong> content for ${f.key}</p>`;
        if (f.type === "image_r2") {
          freshMock[f.key] = {
            url: "/images/commerce-square.webp",
            object_key: "images/commerce-square.webp",
            alt: "Sample product image",
            width: 400,
            height: 400,
          };
        }
        if (f.type === "db_relation") {
          freshMock[f.key] = "mock-id-1";
          
          const mockRecord: Record<string, any> = {
            id: "mock-id-1",
            title: `Mock ${f.table.charAt(0).toUpperCase() + f.table.slice(1)} Title`,
            name: `Mock ${f.table.charAt(0).toUpperCase() + f.table.slice(1)} Name`,
            full_name: "Mock User Full Name",
            sku: "MOCK-SKU-100",
            short_description: "This is a short descriptive blurb for the preview card layout.",
            file_name: "placeholder-file.png",
          };

          // Attach realistic image URLs for tables that support images
          if (f.table === "media") {
            mockRecord.object_key = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=300&fit=crop";
            mockRecord.file_name = "visual-banner.webp";
          } else if (f.table === "profiles") {
            mockRecord.avatar_url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop";
            mockRecord.full_name = "Clara Dupont";
          } else if (f.table === "products") {
            mockRecord.avatar_url = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop";
            mockRecord.object_key = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop";
            mockRecord.title = "Premium Wireless Headphones";
            mockRecord.sku = "HP-WIRELESS-100";
            mockRecord.price = 19900;
            mockRecord.stock = 15;
            mockRecord.short_description = "Active noise cancelling with 40-hour battery life.";
          } else if (f.table === "product_variants") {
            mockRecord.avatar_url = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop";
            mockRecord.object_key = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop";
            mockRecord.sku = "MOCK-VAR-RED-L";
            mockRecord.price = 12900;
            mockRecord.stock_quantity = 42;
          } else if (f.table === "posts" || f.table === "pages") {
            mockRecord.feature_image_id = "mock-image-id";
            mockRecord.avatar_url = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop";
            mockRecord.object_key = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop";
          }

          freshRelations[f.key] = {
            record: mockRecord,
            table: f.table,
            value: "mock-id-1",
          };
        }
      }
    });
    setPreviewValues(freshMock);
    setMockRelationRecords(freshRelations);
  }, [fields]);

  // Handle Slug generation from Name in create mode
  const handleNameChange = (val: string) => {
    setName(val);
    if (mode === "create") {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
      );
    }
  };

  // Pre-generate standard blueprint layout
  const handleGenerateDefaultLayout = () => {
    if (fields.length === 0) {
      toast.error("Please add at least one field first.");
      return;
    }
    const defaultLayout = {
      type: "container",
      as: "div",
      className: "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col gap-4 shadow-sm",
      children: fields.map((f) => {
        if (f.type === "image_r2") {
          return {
            type: "field_render",
            field_key: f.key,
            as: "img",
            className: "h-24 w-24 rounded-full object-cover shadow-sm",
          };
        }
        return {
          type: "field_render",
          field_key: f.key,
          as: f.type === "rich-text" ? "div" : "p",
          className: f.type === "rich-text"
            ? "prose prose-sm max-w-none text-muted-foreground"
            : f.type === "db_relation"
            ? "text-xs font-semibold uppercase tracking-wide bg-muted px-2 py-0.5 rounded text-muted-foreground w-fit"
            : "text-slate-800 dark:text-slate-200 text-sm font-medium",
          emptyFallback: `<p>Empty ${f.label}</p>`,
        };
      }),
    };
    setLayoutSchema(defaultLayout);
    setSelectedNodePath(null);
    toast.success("Generated layout blueprint based on your fields.");
  };

  // Add a field
  const addField = () => {
    const key = `field_${fields.length + 1}`;
    const newField: CustomBlockField = {
      key,
      label: `Field ${fields.length + 1}`,
      type: "text",
      required: false,
    };
    setFields([...fields, newField]);
  };

  // Rename every field_render reference in the layout tree from one key to another
  const renameLayoutFieldKey = (node: any, fromKey: string, toKey: string): any => {
    if (!node || typeof node !== "object") return node;
    if (node.type === "field_render") {
      return node.field_key === fromKey ? { ...node, field_key: toKey } : node;
    }
    if (node.type === "container" && Array.isArray(node.children)) {
      return { ...node, children: node.children.map((child: any) => renameLayoutFieldKey(child, fromKey, toKey)) };
    }
    return node;
  };

  // Migrate a record keyed by field key when that field is renamed
  const migrateKey = <T,>(record: Record<string, T>, fromKey: string, toKey: string): Record<string, T> => {
    if (!(fromKey in record) || fromKey === toKey) return record;
    const next = { ...record };
    next[toKey] = next[fromKey];
    delete next[fromKey];
    return next;
  };

  // Update field parameters
  const updateField = (index: number, updated: Partial<CustomBlockField>) => {
    const list = [...fields];
    const previousKey = list[index].key;

    // Auto populate defaults for db_relation
    if (updated.type === "db_relation" && list[index].type !== "db_relation") {
      const defaultTable = relationTables[0]?.table || "pages";
      const targetTable = relationTables.find(t => t.table === defaultTable);
      updated.table = defaultTable;
      updated.display_column = targetTable?.displayColumn || "title";
      updated.value_column = "id";
      updated.multiple = false;
    }

    list[index] = { ...list[index], ...updated } as CustomBlockField;
    setFields(list);

    // Keep layout references and preview maps in sync when a field key changes,
    // otherwise the layout would reference an unknown field and saving would fail.
    if (updated.key !== undefined && updated.key !== previousKey) {
      const nextKey = updated.key;
      setLayoutSchema((prev: any) => renameLayoutFieldKey(prev, previousKey, nextKey));
      setPreviewValues((prev) => migrateKey(prev, previousKey, nextKey));
      setMockRelationRecords((prev) => migrateKey(prev, previousKey, nextKey));
    }
  };

  // Delete a field
  const deleteField = (index: number) => {
    const fieldKey = fields[index].key;
    const list = [...fields];
    list.splice(index, 1);
    setFields(list);

    // Filter previews
    const freshPreviews = { ...previewValues };
    delete freshPreviews[fieldKey];
    setPreviewValues(freshPreviews);
  };

  // --- Layout Tree Node Editing Functions ---
  const getLayoutNodeByPath = (root: any, path: number[]): any => {
    let current = root;
    for (const idx of path) {
      if (current?.children && current.children[idx]) {
        current = current.children[idx];
      } else {
        return null;
      }
    }
    return current;
  };

  const modifyLayoutTree = (
    node: any,
    path: number[],
    action: "update" | "delete" | "insert",
    payload?: any
  ): any => {
    if (path.length === 0) {
      if (action === "update") {
        return { ...node, ...payload };
      }
      if (action === "insert") {
        return {
          ...node,
          children: [...(node.children || []), payload],
        };
      }
      return node;
    }

    const [head, ...tail] = path;
    if (node.type === "container" && node.children && node.children[head] !== undefined) {
      if (tail.length === 0 && action === "delete") {
        const newChildren = [...node.children];
        newChildren.splice(head, 1);
        return { ...node, children: newChildren };
      }

      const newChildren = [...node.children];
      newChildren[head] = modifyLayoutTree(node.children[head], tail, action, payload);
      return { ...node, children: newChildren };
    }
    return node;
  };

  const handleUpdateSelectedNode = (payload: any) => {
    if (!selectedNodePath) return;
    const updated = modifyLayoutTree(layoutSchema, selectedNodePath, "update", payload);
    setLayoutSchema(updated);
  };

  const handleDeleteNode = (path: number[]) => {
    const updated = modifyLayoutTree(layoutSchema, path, "delete");
    setLayoutSchema(updated);
    setSelectedNodePath(null);
    toast.success("Removed layout node.");
  };

  const handleInsertNode = (path: number[], type: "container" | "field_render") => {
    const newNode =
      type === "container"
        ? {
            type: "container",
            as: "div",
            className: "flex flex-col gap-2 p-2",
            children: [],
          }
        : {
            type: "field_render",
            field_key: fields[0]?.key || "",
            as: "span",
            className: "text-sm",
          };

    const updated = modifyLayoutTree(layoutSchema, path, "insert", newNode);
    setLayoutSchema(updated);
    
    // Autoexpand the path
    const pathKey = JSON.stringify(path);
    setExpandedPaths({ ...expandedPaths, [pathKey]: true });
    toast.success(`Inserted new ${type === "container" ? "Container" : "Field Render"}.`);
  };

  // --- Drag & Drop helpers ---
  const isDescendantOrSelf = (parent: number[], child: number[]): boolean => {
    if (child.length < parent.length) return false;
    for (let i = 0; i < parent.length; i++) {
      if (parent[i] !== child[i]) return false;
    }
    return true;
  };

  const adjustPathAfterRemoval = (source: number[], target: number[]): number[] => {
    let i = 0;
    while (i < source.length && i < target.length) {
      if (source[i] !== target[i]) {
        if (source[i] < target[i]) {
          const adjusted = [...target];
          adjusted[i] = adjusted[i] - 1;
          return adjusted;
        }
        break;
      }
      i++;
    }
    return target;
  };

  const removeNodeFromTree = (root: any, path: number[]): { newRoot: any; removedNode: any } => {
    const getNode = (curr: any, pathTail: number[]): any => {
      let node = curr;
      for (const idx of pathTail) {
        node = node.children[idx];
      }
      return node;
    };
    
    const nodeToRemove = getNode(root, path);
    const clonedNode = JSON.parse(JSON.stringify(nodeToRemove));

    const remove = (node: any, pathTail: number[]): any => {
      if (pathTail.length === 1) {
        const idx = pathTail[0];
        const newChildren = [...node.children];
        newChildren.splice(idx, 1);
        return { ...node, children: newChildren };
      }
      const [head, ...tail] = pathTail;
      const newChildren = [...node.children];
      newChildren[head] = remove(node.children[head], tail);
      return { ...node, children: newChildren };
    };

    if (path.length === 0) return { newRoot: null, removedNode: clonedNode };
    return { newRoot: remove(root, path), removedNode: clonedNode };
  };

  const insertNodeIntoTree = (root: any, path: number[], nodeToInsert: any, position: "before" | "after" | "inside"): any => {
    const insert = (node: any, pathTail: number[]): any => {
      if (pathTail.length === 0) {
        if (position === "inside") {
          return { ...node, children: [...(node.children || []), nodeToInsert] };
        }
        return node;
      }

      if (pathTail.length === 1) {
        const idx = pathTail[0];
        if (position === "inside") {
          const newChildren = [...node.children];
          const targetNode = newChildren[idx];
          newChildren[idx] = { ...targetNode, children: [...(targetNode.children || []), nodeToInsert] };
          return { ...node, children: newChildren };
        } else {
          const newChildren = [...node.children];
          const insertIdx = position === "before" ? idx : idx + 1;
          newChildren.splice(insertIdx, 0, nodeToInsert);
          return { ...node, children: newChildren };
        }
      }

      const [head, ...tail] = pathTail;
      const newChildren = [...node.children];
      newChildren[head] = insert(node.children[head], tail);
      return { ...node, children: newChildren };
    };

    return insert(root, path);
  };

  const handleMoveNode = (source: number[], target: number[], position: "before" | "after" | "inside") => {
    if (isDescendantOrSelf(source, target)) {
      toast.error("Cannot move a parent node inside or relative to its own descendants.");
      return;
    }

    const { newRoot, removedNode } = removeNodeFromTree(layoutSchema, source);
    if (!newRoot) return;

    const adjustedTarget = adjustPathAfterRemoval(source, target);
    const updatedSchema = insertNodeIntoTree(newRoot, adjustedTarget, removedNode, position);
    setLayoutSchema(updatedSchema);
    setSelectedNodePath(null);
    toast.success("Rearranged layout blueprint nodes.");
  };

  // --- Save / Submit Block ---
  const handleSaveBlock = async () => {
    if (!name.trim()) {
      toast.error("Please provide a block name.");
      return;
    }
    if (!slug.trim()) {
      toast.error("Please provide a block slug.");
      return;
    }
    if (fields.length === 0) {
      toast.error("Block must contain at least one field.");
      return;
    }

    const payload = {
      name,
      slug,
      description: description || "",
      is_original: isOriginal,
      fields,
      layout_schema: layoutSchema,
    };

    const toastId = toast.loading(`${mode === "create" ? "Creating" : "Saving"} custom block...`);
    try {
      let res;
      if (mode === "create") {
        res = await createCustomBlockDefinition(payload);
      } else {
        res = await updateCustomBlockDefinition(initialData!.id, payload);
      }

      if (res.success) {
        toast.success(`Block "${name}" saved successfully!`, { id: toastId });
        startTransition(() => {
          router.push("/cms/custom-blocks");
          router.refresh();
        });
      } else {
        const detail =
          res.issues && res.issues.length > 0
            ? `: ${res.issues.slice(0, 3).join("; ")}`
            : "";
        toast.error(`${res.error || "Failed to save block definition."}${detail}`, {
          id: toastId,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred while saving.", { id: toastId });
    }
  };

  // --- Rendering helper for Visual Layout Tree ---
  const renderTreeItem = (node: any, path: number[] = []): React.ReactNode => {
    const isSelected = selectedNodePath && JSON.stringify(selectedNodePath) === JSON.stringify(path);
    const pathKey = JSON.stringify(path);
    const isExpanded = expandedPaths[pathKey] !== false;
    
    const toggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedPaths({
        ...expandedPaths,
        [pathKey]: !isExpanded,
      });
    };

    const nodeName =
      node.type === "container"
        ? `Container (${node.as || "div"})`
        : `Render Field: ${node.field_key || "unmapped"}`;

    return (
      <div key={pathKey} className="ml-4 pl-2 border-l border-slate-100 dark:border-slate-800 space-y-1 mt-1">
        <div
          draggable={true}
          onDragStart={(e) => {
            e.stopPropagation();
            setDraggedPath(path);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", JSON.stringify(path));
          }}
          onDragOver={(e) => {
            if (!draggedPath) return;
            e.preventDefault();
            e.stopPropagation();
            
            const rect = e.currentTarget.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const height = rect.height;
            
            let position: "before" | "after" | "inside";
            if (node.type === "container") {
              if (relativeY < height * 0.25) {
                position = "before";
              } else if (relativeY > height * 0.75) {
                position = "after";
              } else {
                position = "inside";
              }
            } else {
              if (relativeY < height * 0.5) {
                position = "before";
              } else {
                position = "after";
              }
            }
            
            if (JSON.stringify(draggedPath) !== JSON.stringify(path)) {
              setDragOverInfo({ path, position });
            }
          }}
          onDragLeave={() => {
            setDragOverInfo(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!draggedPath) return;
            
            const rect = e.currentTarget.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const height = rect.height;
            
            let position: "before" | "after" | "inside";
            if (node.type === "container") {
              if (relativeY < height * 0.25) {
                position = "before";
              } else if (relativeY > height * 0.75) {
                position = "after";
              } else {
                position = "inside";
              }
            } else {
              if (relativeY < height * 0.5) {
                position = "before";
              } else {
                position = "after";
              }
            }
            
            if (JSON.stringify(draggedPath) !== JSON.stringify(path)) {
              handleMoveNode(draggedPath, path, position);
            }
            
            setDraggedPath(null);
            setDragOverInfo(null);
          }}
          onDragEnd={() => {
            setDraggedPath(null);
            setDragOverInfo(null);
          }}
          onClick={() => setSelectedNodePath(path)}
          className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-grab active:cursor-grabbing transition-all group ${
            isSelected
              ? "bg-primary/10 text-primary border border-primary/20"
              : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent"
          } ${
            dragOverInfo && JSON.stringify(dragOverInfo.path) === JSON.stringify(path)
              ? dragOverInfo.position === "before"
                ? "border-t-2 border-primary scale-[1.01] bg-primary/5"
                : dragOverInfo.position === "after"
                ? "border-b-2 border-primary scale-[1.01] bg-primary/5"
                : "bg-primary/20 border border-primary/40 scale-[1.02]"
              : ""
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className="h-3 w-3 text-slate-400 dark:text-slate-600 shrink-0 cursor-grab group-hover:text-slate-500" />
            {node.type === "container" ? (
              <button onClick={toggleExpand} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}
            {node.type === "container" ? (
              <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
            ) : (
              getFieldIcon(fields.find((f) => f.key === node.field_key)?.type || "text")
            )}
            <span className="truncate">{nodeName}</span>
            {node.className && (
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">
                .{node.className.split(" ")[0]}
              </span>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
            {node.type === "container" && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInsertNode(path, "container");
                  }}
                  className="p-1 rounded text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Add Inner Container"
                >
                  <Layers className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInsertNode(path, "field_render");
                  }}
                  className="p-1 rounded text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Add Field Render"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {path.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNode(path);
                }}
                className="p-1 rounded text-slate-500 hover:text-destructive hover:bg-destructive/10"
                title="Remove Node"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {node.type === "container" && isExpanded && node.children && (
          <div className="space-y-1">
            {node.children.map((child: any, idx: number) => renderTreeItem(child, [...path, idx]))}
          </div>
        )}
      </div>
    );
  };

  const selectedNode = selectedNodePath ? getLayoutNodeByPath(layoutSchema, selectedNodePath) : null;

  // Every field_render node in the layout, in depth-first order, with its path.
  const layoutFieldRefs = useMemo(() => {
    const refs: { path: number[]; key: string }[] = [];
    const walk = (node: any, path: number[]) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "field_render") {
        if (node.field_key) refs.push({ path, key: node.field_key });
        return;
      }
      if (node.type === "container" && Array.isArray(node.children)) {
        node.children.forEach((child: any, idx: number) => walk(child, [...path, idx]));
      }
    };
    walk(layoutSchema, []);
    return refs;
  }, [layoutSchema]);

  // Preview/property inputs follow the layout order (deduped, each field once),
  // with any fields not yet placed in the layout appended at the end.
  const orderedPreviewFields = useMemo(() => {
    const byKey = new Map(fields.map((field) => [field.key, field]));
    const seen = new Set<string>();
    const ordered: CustomBlockField[] = [];
    for (const ref of layoutFieldRefs) {
      if (seen.has(ref.key)) continue;
      const field = byKey.get(ref.key);
      if (field) {
        ordered.push(field);
        seen.add(ref.key);
      }
    }
    for (const field of fields) {
      if (!seen.has(field.key)) {
        ordered.push(field);
        seen.add(field.key);
      }
    }
    return ordered;
  }, [fields, layoutFieldRefs]);

  // Field keys already mapped by a different field_render node, so a property is
  // only used once across the layout blueprint.
  const fieldKeysUsedElsewhere = useMemo(() => {
    const selectedKey = selectedNodePath ? JSON.stringify(selectedNodePath) : null;
    const used = new Set<string>();
    for (const ref of layoutFieldRefs) {
      if (selectedKey && JSON.stringify(ref.path) === selectedKey) continue;
      used.add(ref.key);
    }
    return used;
  }, [layoutFieldRefs, selectedNodePath]);

  // Keep the Properties Schema list itself ordered to match the layout blueprint,
  // so the fields editor mirrors the visual tree order everywhere.
  useEffect(() => {
    setFields((prev) => {
      const ordered = orderCustomBlockFieldsByLayout(prev, layoutSchema);
      const unchanged =
        ordered.length === prev.length && ordered.every((field, index) => field === prev[index]);
      return unchanged ? prev : ordered;
    });
  }, [layoutFieldRefs]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/cms/custom-blocks")} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {mode === "create" ? "Build Custom Block" : `Edit block: ${name}`}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Specify your properties fields schemas and map visual Tailwind nested layouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <BookOpen className="h-4 w-4 text-sky-500" />
                How to Use Guide
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6">
              <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <Boxes className="h-5 w-5 text-indigo-500" />
                  NextBlock Custom Block Creator Guide
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  A quick step-by-step masterclass on designing, structuring, and visually rendering data-driven user blocks.
                </DialogDescription>
              </DialogHeader>

              <div className="py-6 space-y-6 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                {/* Step 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold">STEP 1</Badge>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Configure Name and Slug Identifiers</h4>
                  </div>
                  <p className="pl-14 text-slate-600 dark:text-slate-400">
                    Choose a descriptive name (e.g. <code className="font-mono bg-muted px-1 py-0.5 rounded text-indigo-400">Product Showcase Card</code>). 
                    The slug identifier will auto-populate (e.g. <code className="font-mono bg-muted px-1 py-0.5 rounded text-indigo-400">product-showcase-card</code>). 
                    This slug acts as the database key and cannot be changed once saved.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 text-[10px] font-bold">STEP 2</Badge>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Declare Properties Fields Schema</h4>
                  </div>
                  <p className="pl-14 text-slate-600 dark:text-slate-400 mb-2">
                    Properties define the editable fields editors will populate when adding the block to pages. Supported types:
                  </p>
                  <ul className="pl-14 list-disc space-y-1.5 text-slate-600 dark:text-slate-400">
                    <li><span className="font-bold text-slate-800 dark:text-slate-200">Text:</span> Single line plain string (headings, button labels, links).</li>
                    <li><span className="font-bold text-slate-800 dark:text-slate-200">Rich-Text:</span> Full HTML formatting (body text, custom paragraphs, lists).</li>
                    <li><span className="font-bold text-slate-800 dark:text-slate-200">R2 Image:</span> Media files uploaded directly to Cloudflare R2 object storage.</li>
                    <li><span className="font-bold text-slate-800 dark:text-slate-200">Live DB Relation Link:</span> Reference table rows directly (e.g. link custom pages or products) with dynamic lookup columns.</li>
                  </ul>
                </div>

                {/* Step 3 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">STEP 3</Badge>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Visual Layout Tree & Drag & Drop</h4>
                  </div>
                  <p className="pl-14 text-slate-600 dark:text-slate-400 mb-2">
                    The layout tree outlines how the block is structured inside the DOM. You can nest structural containers and map fields:
                  </p>
                  <ul className="pl-14 list-disc space-y-1.5 text-slate-600 dark:text-slate-400">
                    <li><span className="font-bold text-slate-800 dark:text-slate-200">Containers:</span> Represent tags like <code className="font-mono bg-muted px-1 rounded">&lt;div&gt;</code>, <code className="font-mono bg-muted px-1 rounded">&lt;section&gt;</code>. Style them with Tailwind CSS.</li>
                    <li><span className="font-bold text-slate-800 dark:text-slate-200">Field Renders:</span> Maps a field schema value to an HTML tag (e.g. map image to <code className="font-mono bg-muted px-1 rounded">&lt;img&gt;</code>).</li>
                    <li><span className="font-bold text-slate-800 dark:text-slate-200">Drag & Drop:</span> Click and drag the <GripVertical className="inline-block h-3.5 w-3.5 mx-0.5 text-slate-400" /> handle of any node in the tree list. Hover over targets to drop:
                      <ul className="list-circle pl-6 mt-1 space-y-1">
                        <li>Hover near <span className="font-bold text-indigo-400">top</span> of a node to insert <span className="italic">before</span> it.</li>
                        <li>Hover near <span className="font-bold text-indigo-400">bottom</span> of a node to insert <span className="italic">after</span> it.</li>
                        <li>Hover over the <span className="font-bold text-indigo-400">middle</span> of a container node to nest it <span className="italic">inside</span> as a child.</li>
                      </ul>
                    </li>
                  </ul>
                </div>

                {/* Quick Styling Presets */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-4 border rounded-xl border-slate-100 dark:border-slate-800/80">
                  <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Styling Presets Tip
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400">
                    Select a node in the Layout Tree to inspect it. Use the <span className="font-bold text-slate-800 dark:text-slate-200">Quick-Styling utility Presets</span> to apply grid columns, borders, shadow cards, flex columns, and center alignments with one click. Test inputs on the right visualizer to preview live rendering instantly.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSaveBlock} disabled={isPending} className="shadow-sm">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Block Schema
          </Button>
        </div>
      </div>

      {/* Main Dual-Pane layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left builder pane (7 columns) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab("general")}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "general"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Settings className="h-4 w-4" /> Config metadata
            </button>
            <button
              onClick={() => setActiveTab("fields")}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "fields"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Database className="h-4 w-4" /> Fields Schema
            </button>
            <button
              onClick={() => setActiveTab("layout")}
              className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "layout"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <ListTree className="h-4 w-4" /> Layout Tree
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 min-h-[450px]">
            {/* Tab 1: General Info */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="block-name" className="text-sm font-bold">Block Name</Label>
                  <Input
                    id="block-name"
                    placeholder="e.g. Testimonial Card"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="block-slug" className="text-sm font-bold">Slug Identifier</Label>
                  <Input
                    id="block-slug"
                    placeholder="e.g. testimonial-card"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    disabled={mode === "edit"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique block identifier. Used in schemas and JSON models. Cannot be changed once created.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="block-desc" className="text-sm font-bold">Description</Label>
                  <Textarea
                    id="block-desc"
                    rows={4}
                    placeholder="Describe what this custom block represents or does..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Admin-only note shown in the blocks library — it does not appear on the front end.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Fields Manager */}
            {activeTab === "fields" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Properties Schema
                  </h3>
                  <Button onClick={addField} size="sm" variant="outline">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Property Field
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded-lg border-slate-200 dark:border-slate-800">
                    <Database className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-slate-500 mt-2">No schema fields created.</p>
                    <Button onClick={addField} variant="link" className="mt-2 text-primary font-semibold">
                      Add a field properties selector
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {fields.map((field, idx) => (
                      <div
                        key={idx}
                        className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm"
                      >
                        {/* Identity row */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end p-3">
                          <div className="md:col-span-4 space-y-1">
                            <Label className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Property Key</Label>
                            <Input
                              value={field.key}
                              placeholder="e.g. quote"
                              onChange={(e) => updateField(idx, { key: e.target.value })}
                              className="h-8 font-mono text-xs"
                            />
                          </div>
                          <div className="md:col-span-4 space-y-1">
                            <Label className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Label</Label>
                            <Input
                              value={field.label}
                              placeholder="e.g. Author Name"
                              onChange={(e) => updateField(idx, { label: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="md:col-span-3 space-y-1">
                            <Label className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Type</Label>
                            <select
                              value={field.type}
                              onChange={(e) =>
                                updateField(idx, {
                                  type: e.target.value as "text" | "rich-text" | "image_r2" | "db_relation",
                                })
                              }
                              className="w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-8"
                            >
                              <option value="text">Text (single-line)</option>
                              <option value="rich-text">Rich-Text (HTML)</option>
                              <option value="image_r2">Cloudflare R2 Image</option>
                              <option value="db_relation">Live DB Relation Link</option>
                            </select>
                          </div>
                          <div className="md:col-span-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteField(idx)}
                              className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                              title="Remove field"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Config + flags strip: context on the left, toggles on the right */}
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-950/30 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {field.type === "db_relation" ? (
                              <>
                                <Label className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground shrink-0">
                                  Table
                                </Label>
                                <select
                                  value={field.table}
                                  onChange={(e) => {
                                    const table = e.target.value;
                                    const spec = relationTables.find((t) => t.table === table);
                                    updateField(idx, {
                                      table,
                                      display_column: spec?.displayColumn || "title",
                                      value_column: spec?.valueColumn || "id",
                                    });
                                  }}
                                  className="h-7 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                  {relationTables.map((t) => (
                                    <option key={t.table} value={t.table}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                                <span className="hidden lg:inline truncate text-[11px] text-muted-foreground">
                                  · choose the column in the Layout Tree
                                </span>
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                {getFieldIcon(field.type)}
                                {field.type === "text"
                                  ? "Single-line text"
                                  : field.type === "rich-text"
                                    ? "Formatted HTML content"
                                    : "Direct image upload (Cloudflare R2)"}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {field.type === "db_relation" && (
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`multiple-${idx}`}
                                  checked={field.multiple === true}
                                  onCheckedChange={(checked) => updateField(idx, { multiple: checked === true })}
                                />
                                <Label htmlFor={`multiple-${idx}`} className="text-xs font-medium cursor-pointer">
                                  Link multiple
                                </Label>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`required-${idx}`}
                                checked={field.required === true}
                                onCheckedChange={(checked) => updateField(idx, { required: checked === true })}
                              />
                              <Label htmlFor={`required-${idx}`} className="text-xs font-medium cursor-pointer">
                                Required
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Visual Layout Tree Editor */}
            {activeTab === "layout" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Layout Schema Blueprint
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Infinitely nest containers or render mapped schema properties fields.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleGenerateDefaultLayout} size="sm" variant="outline">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                      Reset Blueprint Layout
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left tree layout list (5 columns) */}
                  <div className="md:col-span-6 border rounded-xl border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30 max-h-[380px] overflow-y-auto">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                      Tree Nodes
                    </h4>
                    {renderTreeItem(layoutSchema, [])}
                  </div>

                  {/* Right inspector config (6 columns) */}
                  <div className="md:col-span-6 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 border-b pb-2 uppercase tracking-wide">
                      Node Properties Inspector
                    </h4>

                    {!selectedNode ? (
                      <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-full">
                        <Layers className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                        <span className="text-xs italic">Select a layout node on the left to inspect or style.</span>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs">
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded border">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Node Type:
                          </span>
                          <Badge variant="secondary" className="uppercase font-mono text-[10px]">
                            {selectedNode.type}
                          </Badge>
                        </div>

                        {selectedNode.type === "container" ? (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="font-semibold">HTML Element Tag</Label>
                              <select
                                value={selectedNode.as || "div"}
                                onChange={(e) => handleUpdateSelectedNode({ as: e.target.value })}
                                className="w-full rounded-md border h-8 px-2 bg-transparent text-xs"
                              >
                                {CONTAINER_TAGS.map((tag) => (
                                  <option key={tag} value={tag}>
                                    &lt;{tag}&gt; Element
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="font-semibold">Map Property Field</Label>
                              <select
                                value={selectedNode.field_key || ""}
                                onChange={(e) => {
                                  const key = e.target.value;
                                  const type = fields.find((f) => f.key === key)?.type || "text";
                                  handleUpdateSelectedNode({
                                    field_key: key,
                                    as: type === "image_r2" ? "img" : type === "rich-text" ? "div" : "span",
                                  });
                                }}
                                className="w-full rounded-md border h-8 px-2 bg-transparent text-xs"
                              >
                                <option value="" disabled>Select property key...</option>
                                {fields.map((f) => {
                                  // Relation fields may be reused by multiple nodes (e.g. image, title,
                                  // price); only single-value fields are limited to one placement.
                                  const usedElsewhere =
                                    fieldKeysUsedElsewhere.has(f.key) && f.type !== "db_relation";
                                  return (
                                    <option key={f.key} value={f.key} disabled={usedElsewhere}>
                                      {f.label} ({f.key}){usedElsewhere ? " — already used" : ""}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            {(() => {
                              const mappedField = fields.find((f) => f.key === selectedNode.field_key);
                              if (mappedField?.type !== "db_relation") return null;
                              const spec = relationTables.find((t) => t.table === mappedField.table);
                              const columns = spec?.selectColumns || [];
                              return (
                                <div className="space-y-1">
                                  <Label className="font-semibold">Relation Column</Label>
                                  <select
                                    value={selectedNode.column || ""}
                                    onChange={(e) => handleUpdateSelectedNode({ column: e.target.value || undefined })}
                                    className="w-full rounded-md border h-8 px-2 bg-transparent text-xs"
                                  >
                                    <option value="">Default ({mappedField.display_column})</option>
                                    {columns.map((col) => (
                                      <option key={col} value={col}>
                                        {col}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-[10px] text-muted-foreground">
                                    Which column of the related record to show. Render as &lt;img&gt; for its image; price columns display as currency.
                                  </p>
                                </div>
                              );
                            })()}
                            <div className="space-y-1">
                              <Label className="font-semibold">Render Tag Element</Label>
                              <select
                                value={selectedNode.as || "span"}
                                onChange={(e) => handleUpdateSelectedNode({ as: e.target.value })}
                                className="w-full rounded-md border h-8 px-2 bg-transparent text-xs"
                              >
                                {FIELD_TAGS.map((tag) => (
                                  <option key={tag} value={tag}>
                                    &lt;{tag}&gt; Render Target
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label className="font-semibold">Empty Fallback Copy</Label>
                              <Input
                                value={selectedNode.emptyFallback || ""}
                                onChange={(e) => handleUpdateSelectedNode({ emptyFallback: e.target.value })}
                                placeholder="e.g. Quote content goes here..."
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="font-semibold">Tailwind CSS Classes</Label>
                          <Textarea
                            value={selectedNode.className || ""}
                            onChange={(e) => handleUpdateSelectedNode({ className: e.target.value })}
                            placeholder="e.g. flex flex-col gap-4 text-center mt-2 border"
                            className="font-mono text-xs"
                            rows={3}
                          />
                        </div>

                        {/* Styling presets */}
                        <div className="space-y-2 pt-2 border-t">
                          <Label className="font-bold text-muted-foreground uppercase text-[9px] block">
                            Quick-Styling utility Presets
                          </Label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] justify-start h-7 px-2"
                              onClick={() => {
                                const current = selectedNode.className || "";
                                const base = current.includes("flex") ? current : `flex flex-col gap-4 ${current}`.trim();
                                handleUpdateSelectedNode({ className: base });
                              }}
                            >
                              Flex Column
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] justify-start h-7 px-2"
                              onClick={() => {
                                const current = selectedNode.className || "";
                                const base = current.includes("grid") ? current : `grid gap-6 md:grid-cols-2 ${current}`.trim();
                                handleUpdateSelectedNode({ className: base });
                              }}
                            >
                              Grid (2 Cols)
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] justify-start h-7 px-2"
                              onClick={() => {
                                const current = selectedNode.className || "";
                                const base = current.includes("p-") ? current : `p-6 rounded-xl border bg-card shadow-sm ${current}`.trim();
                                handleUpdateSelectedNode({ className: base });
                              }}
                            >
                              Bordered Card
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] justify-start h-7 px-2"
                              onClick={() => {
                                const current = selectedNode.className || "";
                                const base = current.includes("items-center") ? current : `items-center justify-center text-center ${current}`.trim();
                                handleUpdateSelectedNode({ className: base });
                              }}
                            >
                              Align Center
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right preview pane (5 columns) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-bold tracking-wider uppercase">
                Dynamic Layout Editor Preview
              </h3>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold text-[10px]">
              Live Playground
            </Badge>
          </div>

          {/* Renders layout engine compilation */}
          <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-xl min-h-[220px] flex items-center justify-center overflow-x-auto">
            {fields.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">Add properties fields to start layout blueprint</span>
            ) : (
              <div className="w-full">
                <DynamicLayoutEngine
                  fields={fields}
                  layoutSchema={layoutSchema}
                  data={{
                    ...previewValues,
                    resolved_relations: mockRelationRecords,
                  }}
                />
              </div>
            )}
          </div>

          {/* Preview data input values form */}
          {fields.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="py-3.5 border-b">
                <CardTitle className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                  Test Mock Values Playground
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Fill these custom sandbox inputs to visualize your Tailwind CSS alignment.
                </CardDescription>
              </CardHeader>
              <CardContent className="py-4 space-y-4 max-h-[300px] overflow-y-auto">
                {orderedPreviewFields.map((f) => {
                  const fieldVal = previewValues[f.key];
                  const fieldId = `preview-${f.key}`;

                  return (
                    <div key={f.key} className="space-y-1.5 text-xs">
                      <Label htmlFor={fieldId} className="font-semibold text-slate-700 dark:text-slate-300">
                        {f.label} ({f.key}) {f.required && <span className="text-destructive">*</span>}
                      </Label>
                      {f.type === "rich-text" ? (
                        <Textarea
                          id={fieldId}
                          value={fieldVal || ""}
                          onChange={(e) => setPreviewValues({ ...previewValues, [f.key]: e.target.value })}
                          className="text-xs"
                          rows={2}
                        />
                      ) : f.type === "image_r2" ? (
                        <ImageR2Picker
                          value={fieldVal && typeof fieldVal === "object" && "url" in fieldVal ? fieldVal : null}
                          onChange={(val) => setPreviewValues({ ...previewValues, [f.key]: val })}
                          accept={f.accept}
                          maxBytes={f.max_bytes}
                        />
                      ) : f.type === "db_relation" ? (
                        <DBRelationSelect
                          table={f.table}
                          value={
                            f.multiple
                              ? Array.isArray(fieldVal) ? fieldVal.map(String) : []
                              : fieldVal ? String(fieldVal) : null
                          }
                          onChange={(val, selected) => {
                            setPreviewValues({ ...previewValues, [f.key]: val });
                            if (f.multiple) {
                              setMockRelationRecords({
                                ...mockRelationRecords,
                                [f.key]: selected || [],
                              });
                            } else {
                              setMockRelationRecords({
                                ...mockRelationRecords,
                                [f.key]: selected?.[0] || null,
                              });
                            }
                          }}
                          multiple={f.multiple}
                          displayColumn={f.display_column}
                          valueColumn={f.value_column}
                          filters={f.filters}
                        />
                      ) : (
                        <Input
                          id={fieldId}
                          value={fieldVal || ""}
                          onChange={(e) => setPreviewValues({ ...previewValues, [f.key]: e.target.value })}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
