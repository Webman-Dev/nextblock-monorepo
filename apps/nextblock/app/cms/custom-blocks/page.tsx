"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  PlusCircle,
  Copy,
  Trash2,
  Edit,
  Search,
  Grid,
  List,
  Boxes,
  Loader2,
  Code,
  Layers,
  Database,
  ImageIcon,
  Type,
  HelpCircle,
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
  ConfirmationDialog,
  Skeleton,
} from "@nextblock-cms/ui";
import {
  listCustomBlockDefinitions,
  deleteCustomBlockDefinition,
  duplicateCustomBlockDefinition,
} from "./actions";
import { BlocksLibraryTransferControls } from "./components/BlocksLibraryTransferControls";
import type { CustomBlockDefinition } from "@nextblock-cms/utils";

export default function CustomBlocksListPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [blocks, setBlocks] = useState<CustomBlockDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deletingBlock, setDeletingBlock] = useState<CustomBlockDefinition | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const res = await listCustomBlockDefinitions();
      if (res.success) {
        setBlocks(res.data);
      } else {
        toast.error(res.error || "Failed to load custom blocks.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred loading blocks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();

    // Refetch when Cortex AI (or another surface) reports a custom block change,
    // and when the tab regains focus, so the library stays in sync without a reload.
    const handleDataChanged = () => fetchBlocks();
    window.addEventListener("nextblock:cortex-data-changed", handleDataChanged);
    window.addEventListener("focus", handleDataChanged);

    return () => {
      window.removeEventListener("nextblock:cortex-data-changed", handleDataChanged);
      window.removeEventListener("focus", handleDataChanged);
    };
  }, []);

  const handleDuplicate = async (id: string, name: string) => {
    setDuplicatingId(id);
    const toastId = toast.loading(`Duplicating block "${name}"...`);
    try {
      const res = await duplicateCustomBlockDefinition(id);
      if (res.success) {
        toast.success(`Duplicated "${name}" successfully!`, { id: toastId });
        fetchBlocks();
      } else {
        toast.error(res.error || `Failed to duplicate "${name}".`, { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred during duplication.", { id: toastId });
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingBlock) return;
    const blockName = deletingBlock.name;
    const blockId = deletingBlock.id;
    setDeletingBlock(null);

    const toastId = toast.loading(`Deleting block "${blockName}"...`);
    try {
      const res = await deleteCustomBlockDefinition(blockId);
      if (res.success) {
        toast.success(`Deleted block "${blockName}".`, { id: toastId });
        fetchBlocks();
      } else {
        toast.error(res.error || `Failed to delete block "${blockName}".`, { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred during deletion.", { id: toastId });
    }
  };

  const filteredBlocks = blocks.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getFieldIcon = (type: string) => {
    switch (type) {
      case "text":
        return <Type className="h-3 w-3 mr-1 text-sky-500" />;
      case "rich-text":
        return <Code className="h-3 w-3 mr-1 text-emerald-500" />;
      case "image_r2":
        return <ImageIcon className="h-3 w-3 mr-1 text-amber-500" />;
      case "db_relation":
        return <Database className="h-3 w-3 mr-1 text-violet-500" />;
      default:
        return <HelpCircle className="h-3 w-3 mr-1 text-slate-500" />;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Blocks Library</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Build and manage custom block modules, layouts, and relations for rich pages.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BlocksLibraryTransferControls onImported={fetchBlocks} />
          <Button asChild className="shadow-sm hover:scale-[1.01] transition-transform">
            <Link href="/cms/custom-blocks/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Custom Block
            </Link>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search custom blocks by name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 dark:bg-slate-900/60"
          />
        </div>
        <div className="flex items-center gap-2 border rounded-lg p-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 self-end sm:self-auto">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            className="h-8 w-8"
            title="Grid View"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            className="h-8 w-8"
            title="List View"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Listing Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="h-[240px] border-slate-200 dark:border-slate-800">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBlocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Boxes className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">No blocks found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            {searchQuery
              ? "No blocks matched your search criteria. Try modifying your filters."
              : "No custom blocks are registered. Start creating custom layouts or prompt Cortex AI."}
          </p>
          {!searchQuery && (
            <Button asChild className="mt-6">
              <Link href="/cms/custom-blocks/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Block
              </Link>
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlocks.map((block) => (
            <Card
              key={block.id}
              className="flex flex-col justify-between border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80 transition-all duration-200 rounded-xl overflow-hidden"
            >
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50 leading-tight">
                      {block.name}
                    </CardTitle>
                    <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded block w-fit">
                      {block.slug}
                    </code>
                  </div>
                  <Badge
                    variant={block.is_original ? "outline" : "default"}
                    className={
                      block.is_original
                        ? "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium shrink-0"
                        : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 font-medium shrink-0"
                    }
                  >
                    {block.is_original ? "Original" : "Custom"}
                  </Badge>
                </div>
                {block.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                    {block.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="py-4 space-y-3 flex-grow">
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Fields Schema ({block.fields.length})
                  </h4>
                  {block.fields.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">No fields defined</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {block.fields.map((f) => (
                        <div
                          key={f.key}
                          className="inline-flex items-center text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 font-medium"
                          title={`${f.label} (${f.type})`}
                        >
                          {getFieldIcon(f.type)}
                          <span className="truncate max-w-[100px]">{f.key}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-3 pb-4 px-6 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/40 flex justify-between items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 px-2.5"
                  onClick={() => setDeletingBlock(block)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                </Button>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2.5 dark:border-slate-700"
                    disabled={duplicatingId === block.id}
                    onClick={() => handleDuplicate(block.id, block.name)}
                  >
                    {duplicatingId === block.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1.5" />
                    )}
                    Duplicate
                  </Button>
                  <Button asChild size="sm" className="px-2.5">
                    <Link href={`/cms/custom-blocks/${block.id}/edit`}>
                      <Edit className="h-4 w-4 mr-1.5" /> Edit
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Block Name / Slug</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Origin</th>
                <th className="px-6 py-4">Fields count</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filteredBlocks.map((block) => (
                <tr
                  key={block.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {block.name}
                      </span>
                      <code className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {block.slug}
                      </code>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground max-w-sm truncate">
                    {block.description || <span className="italic text-xs">No description</span>}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={block.is_original ? "outline" : "default"}
                      className={
                        block.is_original
                          ? "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60"
                      }
                    >
                      {block.is_original ? "Original" : "Custom"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary" className="font-medium bg-slate-100 dark:bg-slate-800">
                      {block.fields.length} fields
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={duplicatingId === block.id}
                        onClick={() => handleDuplicate(block.id, block.name)}
                        title="Duplicate"
                        className="h-8 w-8 text-slate-600 dark:text-slate-300"
                      >
                        {duplicatingId === block.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        className="h-8 w-8 text-slate-600 dark:text-slate-300"
                      >
                        <Link href={`/cms/custom-blocks/${block.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingBlock(block)}
                        title="Delete"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog for Deleting Block */}
      <ConfirmationDialog
        isOpen={deletingBlock !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingBlock(null);
        }}
        onConfirm={handleDelete}
        title="Delete Block Definition"
        description={`Are you sure you want to delete the block "${deletingBlock?.name}"? All custom instances of this block in pages and posts will lose their visual formatting and render settings.`}
        confirmText="Delete Block"
        isDestructive={true}
      />
    </div>
  );
}
