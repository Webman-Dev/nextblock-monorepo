"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Download, FileDown, FileSpreadsheet, Upload } from "lucide-react";

import type {
  CmsContentType,
  CmsImportApplyMode,
  CmsImportConflictMode,
  CmsImportSummary,
} from "../../../lib/cms-transfer/types";
import {
  applyCmsCsvImportAction,
  dryRunCmsCsvImportAction,
  exportCmsCsvAction,
  getCmsCsvTemplateAction,
} from "./actions";

interface ContentTransferControlsProps {
  contentType: CmsContentType;
  label: string;
  languageId?: number;
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
        <Badge variant="outline">{summary.totalRows} rows</Badge>
        <Badge variant="outline">{summary.created} create</Badge>
        <Badge variant="outline">{summary.updated} update</Badge>
        {summary.warnings.length > 0 ? (
          <Badge variant="secondary">{summary.warnings.length} warnings</Badge>
        ) : null}
      </div>

      {summary.errors.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>
            {summary.errors.slice(0, 5).map((error) => (
              <span key={`${error.row}-${error.message}`} className="block">
                Row {error.row}: {error.message}
              </span>
            ))}
            {summary.errors.length > 5 ? (
              <span className="block">And {summary.errors.length - 5} more errors.</span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {summary.warnings.length > 0 ? (
        <Alert>
          <AlertDescription>
            {summary.warnings.slice(0, 4).map((warning) => (
              <span key={`${warning.row}-${warning.message}`} className="block">
                Row {warning.row}: {warning.message}
              </span>
            ))}
            {summary.warnings.length > 4 ? (
              <span className="block">And {summary.warnings.length - 4} more warnings.</span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export function ContentTransferControls({
  contentType,
  label,
  languageId,
}: ContentTransferControlsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [conflictMode, setConflictMode] =
    useState<CmsImportConflictMode>("overwrite_existing");
  const [applyMode, setApplyMode] = useState<CmsImportApplyMode>("draft");
  const [summary, setSummary] = useState<CmsImportSummary | null>(null);
  const [isPending, startTransition] = useTransition();

  const downloadTemplate = () => {
    startTransition(async () => {
      const result = await getCmsCsvTemplateAction(contentType);
      if (!result.success || !result.content || !result.fileName || !result.mimeType) {
        toast.error(result.error || "Failed to download template.");
        return;
      }
      downloadTextFile(result.fileName, result.mimeType, result.content);
    });
  };

  const exportCsv = () => {
    startTransition(async () => {
      const result = await exportCmsCsvAction({ contentType, languageId });
      if (!result.success || !result.content || !result.fileName || !result.mimeType) {
        toast.error(result.error || "Failed to export CSV.");
        return;
      }
      downloadTextFile(result.fileName, result.mimeType, result.content);
    });
  };

  const reviewImport = () => {
    if (!csv.trim()) {
      toast.error("Choose a CSV file first.");
      return;
    }

    startTransition(async () => {
      const result = await dryRunCmsCsvImportAction({
        contentType,
        csv,
        conflictMode,
        applyMode,
      });
      setSummary(result);
      if (result.success) {
        toast.success("Import review is ready.");
      } else {
        toast.error("Import has errors to fix.");
      }
    });
  };

  const applyImport = () => {
    if (!summary?.success || !csv.trim()) return;

    startTransition(async () => {
      const result = await applyCmsCsvImportAction({
        contentType,
        csv,
        conflictMode,
        applyMode,
      });
      setSummary(result);
      if (!result.success) {
        toast.error("Import failed validation.");
        return;
      }

      toast.success(`${label} import complete.`);
      setOpen(false);
      setCsv("");
      setFileName("");
      setSummary(null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={isPending}>
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import {label}</DialogTitle>
            <DialogDescription>
              Review the CSV before applying changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={`${contentType}-csv-file`}>CSV file</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  disabled={isPending}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>
              <Input
                id={`${contentType}-csv-file`}
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  setSummary(null);
                  if (!file) return;
                  setFileName(file.name);
                  try {
                    setCsv(await readFileAsText(file));
                  } catch {
                    toast.error("Failed to read CSV file.");
                  }
                }}
              />
              {fileName ? (
                <p className="text-xs text-muted-foreground">{fileName}</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Existing records</Label>
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
                    <SelectItem value="overwrite_existing">Overwrite matches</SelectItem>
                    <SelectItem value="create_new">Create new copies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Apply as</Label>
                <Select
                  value={applyMode}
                  onValueChange={(value) => {
                    setApplyMode(value as CmsImportApplyMode);
                    setSummary(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Drafts</SelectItem>
                    <SelectItem value="live">Live content</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SummaryPanel summary={summary} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={reviewImport}
              disabled={isPending || !csv.trim()}
            >
              {isPending ? <Spinner className="mr-2 h-4 w-4" /> : <FileDown className="mr-2 h-4 w-4" />}
              Review Import
            </Button>
            <Button
              type="button"
              onClick={applyImport}
              disabled={isPending || !summary?.success || !csv.trim()}
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
