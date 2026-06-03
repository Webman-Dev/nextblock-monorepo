"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "react-hot-toast";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from "@nextblock-cms/ui";
import { Download, FileDown, Upload } from "lucide-react";

import type { CmsImportConflictMode, CmsImportSummary } from "../../../../lib/cms-transfer/types";
import {
  applyBlocksLibraryImportAction,
  dryRunBlocksLibraryImportAction,
  exportBlocksLibraryAction,
} from "../actions";

interface BlocksLibraryTransferControlsProps {
  onImported?: () => void;
}

function downloadTextFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

function SummaryPanel({ summary }: { summary: CmsImportSummary | null }) {
  if (!summary) return null;

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant={summary.success ? "default" : "destructive"}>
          {summary.success ? "Ready" : "Needs Fixes"}
        </Badge>
        <Badge variant="outline">{summary.totalRows} blocks</Badge>
        <Badge variant="outline">{summary.created} create</Badge>
        <Badge variant="outline">{summary.updated} update</Badge>
        {summary.warnings.length > 0 ? (
          <Badge variant="secondary">{summary.warnings.length} warnings</Badge>
        ) : null}
      </div>

      {summary.errors.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>
            {summary.errors.slice(0, 6).map((error) => (
              <span key={`${error.row}-${error.message}`} className="block">
                {error.row ? `Row ${error.row}: ` : ""}
                {error.message}
              </span>
            ))}
            {summary.errors.length > 6 ? (
              <span className="block">And {summary.errors.length - 6} more errors.</span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {summary.warnings.length > 0 ? (
        <Alert>
          <AlertDescription>
            {summary.warnings.slice(0, 4).map((warning) => (
              <span key={`${warning.row}-${warning.message}`} className="block">
                {warning.message}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export function BlocksLibraryTransferControls({ onImported }: BlocksLibraryTransferControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [bundleJson, setBundleJson] = useState("");
  const [fileName, setFileName] = useState("");
  const [conflictMode, setConflictMode] = useState<CmsImportConflictMode>("overwrite_existing");
  const [summary, setSummary] = useState<CmsImportSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  const exportLibrary = () => {
    startTransition(async () => {
      const result = await exportBlocksLibraryAction();
      if (!result.success || !result.content || !result.fileName || !result.mimeType) {
        toast.error(result.error || "Failed to export blocks library.");
        return;
      }
      downloadTextFile(result.fileName, result.mimeType, result.content);
      toast.success("Blocks library exported.");
    });
  };

  const reviewImport = () => {
    if (!bundleJson.trim()) {
      toast.error("Choose a blocks library JSON file first.");
      return;
    }

    startTransition(async () => {
      const result = await dryRunBlocksLibraryImportAction({ bundleJson, conflictMode });
      setSummary(result);
      if (result.success) {
        toast.success("Import review is ready.");
      } else {
        toast.error("Import has errors to fix.");
      }
    });
  };

  const applyImport = () => {
    if (!summary?.success || !bundleJson.trim()) return;

    startTransition(async () => {
      const result = await applyBlocksLibraryImportAction({ bundleJson, conflictMode });
      setSummary(result);
      if (!result.success) {
        toast.error("Import failed validation.");
        return;
      }

      toast.success("Blocks library import complete.");
      setOpen(false);
      setBundleJson("");
      setFileName("");
      setSummary(null);
      onImported?.();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={exportLibrary} disabled={isPending}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Blocks Library</DialogTitle>
            <DialogDescription>
              Restore custom block definitions from a JSON file exported here or from a content backup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blocks-library-file">Blocks library JSON file</Label>
              <Input
                id="blocks-library-file"
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  setSummary(null);
                  if (!file) return;
                  setFileName(file.name);
                  try {
                    setBundleJson(await readFileAsText(file));
                  } catch {
                    toast.error("Failed to read JSON file.");
                  }
                }}
              />
              {fileName ? <p className="text-xs text-muted-foreground">{fileName}</p> : null}
            </div>

            <div className="space-y-2">
              <Label>Existing blocks</Label>
              <Select
                value={conflictMode}
                onValueChange={(value) => {
                  setConflictMode(value as CmsImportConflictMode);
                  setSummary(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overwrite_existing">Overwrite blocks with the same slug</SelectItem>
                  <SelectItem value="create_new">Import every block as a new copy</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Blocks are matched by slug. &quot;Create new copies&quot; imports each block under a fresh
                <code className="mx-1">-copy</code> slug instead of replacing the existing one.
              </p>
            </div>

            <SummaryPanel summary={summary} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={reviewImport}
              disabled={isPending || !bundleJson.trim()}
            >
              {isPending ? <Spinner className="mr-2 h-4 w-4" /> : <FileDown className="mr-2 h-4 w-4" />}
              Review Import
            </Button>
            <Button
              type="button"
              onClick={applyImport}
              disabled={isPending || !summary?.success || !bundleJson.trim()}
            >
              {isPending ? <Spinner className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
              Apply Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
