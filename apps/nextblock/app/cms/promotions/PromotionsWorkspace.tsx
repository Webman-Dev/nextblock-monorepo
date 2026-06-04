"use client";

import { useRef, useState, useTransition } from "react";
import { UploadCloud } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@nextblock-cms/ui";

import {
  applyPromotionsImportAction,
  dryRunPromotionsImportAction,
  exportPromotionsAction,
  getPromotionsTemplateAction,
} from "./actions";
import type {
  PromotionImportSummary,
  PromotionKind,
  PromotionTransferResult,
} from "../../../lib/promotions/server";

interface PromotionsWorkspaceProps {
  isEcommerceActive: boolean;
}

const TABS: Array<{ kind: PromotionKind; label: string; description: string }> = [
  {
    kind: "sale",
    label: "Promotions (Sales)",
    description:
      "Bulk-schedule sale prices with a start/end window. Enter a SKU (it matches products and variations), and a price as a single number (e.g. 14.99) or a currency map (e.g. {\"USD\":14.99,\"EUR\":13.5}). <br>Dates are optional — leave them empty for an always-on sale; a date with no time is inclusive (start of day to end of day). <br>Sales switch on/off automatically, and Freemius products get a matching time-bounded coupon.",
  },
  {
    kind: "price_change",
    label: "Price Changes",
    description:
      "Bulk-schedule a permanent regular-price change that takes effect from a date. Enter a SKU and a new price (single number or currency map). <br>Intended for Stripe/physical products Freemius regular prices are owned by Freemius and are skipped.",
  },
];

function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function downloadCsv(result: PromotionTransferResult) {
  if (!result.content || !result.fileName) {
    return;
  }
  const blob = new Blob([result.content], { type: result.mimeType || "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function PromotionsWorkspace({ isEcommerceActive }: PromotionsWorkspaceProps) {
  const [activeKind, setActiveKind] = useState<PromotionKind>("sale");
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<PromotionImportSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeTab = TABS.find((tab) => tab.kind === activeKind) ?? TABS[0];

  function resetImportState() {
    setCsvContent(null);
    setFileName(null);
    setSummary(null);
    setStatusMessage(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function switchKind(kind: PromotionKind) {
    setActiveKind(kind);
    resetImportState();
  }

  async function processFile(file: File | null) {
    setSummary(null);
    setStatusMessage(null);
    setErrorMessage(null);
    if (!file) {
      setCsvContent(null);
      setFileName(null);
      return;
    }
    const isCsv =
      file.type === "text/csv" ||
      file.type === "application/vnd.ms-excel" ||
      file.name.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      setCsvContent(null);
      setFileName(null);
      setErrorMessage("Please choose a .csv file.");
      return;
    }
    try {
      const text = await readFileAsText(file);
      setCsvContent(text);
      setFileName(file.name);
    } catch {
      setErrorMessage("Could not read the selected file.");
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    void processFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    void processFile(event.dataTransfer.files?.[0] ?? null);
  }

  function handleTemplate() {
    startTransition(async () => {
      const result = await getPromotionsTemplateAction(activeKind);
      if (!result.success) {
        setErrorMessage(result.error || "Failed to build template.");
        return;
      }
      downloadCsv(result);
    });
  }

  function handleExport() {
    startTransition(async () => {
      const result = await exportPromotionsAction(activeKind);
      if (!result.success) {
        setErrorMessage(result.error || "Failed to export CSV.");
        return;
      }
      downloadCsv(result);
    });
  }

  function handleDryRun() {
    if (!csvContent) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    startTransition(async () => {
      const result = await dryRunPromotionsImportAction({
        kind: activeKind,
        content: csvContent,
      });
      if (!result.success || !result.summary) {
        setErrorMessage(result.error || "Validation failed.");
        return;
      }
      setSummary(result.summary);
      setStatusMessage(
        result.summary.errors.length === 0
          ? "Validation passed. Review the preview, then apply."
          : "Validation found errors. Fix them and re-validate."
      );
    });
  }

  function handleApply() {
    if (!csvContent) {
      return;
    }
    setErrorMessage(null);
    setStatusMessage(null);
    startTransition(async () => {
      const result = await applyPromotionsImportAction({
        kind: activeKind,
        content: csvContent,
      });
      if (!result.success || !result.summary) {
        setErrorMessage(result.error || "Import failed.");
        return;
      }
      setSummary(result.summary);
      setStatusMessage(
        result.summary.errors.length === 0
          ? `Applied ${result.summary.applied} row(s).${
              result.summary.skipped ? ` Skipped ${result.summary.skipped}.` : ""
            }`
          : "Import aborted because of validation errors. No changes were made."
      );
    });
  }

  const canApply = Boolean(summary && summary.errors.length === 0 && csvContent);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Bulk Price & Sales</h1>
        <p className="text-sm text-muted-foreground">
          Bulk-schedule sale prices and regular-price changes across many products
          via CSV. Schedules take effect at read time — there is nothing to run.
        </p>
      </div>

      {!isEcommerceActive ? (
        <Alert variant="destructive">
          <AlertTitle>Ecommerce package inactive</AlertTitle>
          <AlertDescription>
            Promotions require an active ecommerce license. Activate it in Packages
            to manage scheduled pricing.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((tab) => (
          <Button
            key={tab.kind}
            type="button"
            variant={tab.kind === activeKind ? "default" : "outline"}
            size="lg"
            onClick={() => switchKind(tab.kind)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{activeTab.label}</CardTitle>
          <CardDescription dangerouslySetInnerHTML={{ __html: activeTab.description }} />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTemplate}
              disabled={isPending}
            >
              Download template
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              disabled={isPending}
            >
              {activeKind === "price_change"
                ? "Export current prices"
                : "Export current sales"}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Upload CSV
            </label>
            {/* Hidden native input; the styled dropzone below triggers it. */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload a CSV file by clicking or dragging it here"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragActive(false);
              }}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <div className="pointer-events-none flex flex-col items-center gap-2">
                <UploadCloud
                  className={`h-8 w-8 ${isDragActive ? "text-primary" : "text-muted-foreground"}`}
                />
                {fileName ? (
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{fileName}</p>
                    <p className="text-xs text-muted-foreground">Click or drop to replace</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      Drag &amp; drop your CSV here, or{" "}
                      <span className="text-primary underline">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground">.csv files only</p>
                  </div>
                )}
              </div>
            </div>
            {fileName ? (
              <button
                type="button"
                onClick={resetImportState}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
              >
                Remove file
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDryRun}
              disabled={isPending || !csvContent}
            >
              {isPending ? "Working…" : "Validate (dry run)"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={isPending || !canApply}
            >
              Apply import
            </Button>
          </div>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {statusMessage ? (
            <Alert>
              <AlertTitle>Status</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          ) : null}

          {summary ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  <strong>{summary.totalRows}</strong> rows
                </span>
                <span>
                  <strong>{summary.applied}</strong> applied
                </span>
                <span>
                  <strong>{summary.skipped}</strong> skipped
                </span>
                <span className="text-destructive">
                  <strong>{summary.errors.length}</strong> errors
                </span>
                <span className="text-amber-600">
                  <strong>{summary.warnings.length}</strong> warnings
                </span>
              </div>

              {summary.errors.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-destructive">
                    Errors
                  </p>
                  <ul className="space-y-0.5 text-xs text-destructive">
                    {summary.errors.map((message, index) => (
                      <li key={`error-${index}`}>
                        Row {message.row}: {message.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {summary.warnings.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Warnings
                  </p>
                  <ul className="space-y-0.5 text-xs text-amber-600">
                    {summary.warnings.map((message, index) => (
                      <li key={`warning-${index}`}>
                        Row {message.row}: {message.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {summary.preview.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Preview
                  </p>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {summary.preview.slice(0, 50).map((item, index) => (
                      <li key={`preview-${index}`}>
                        Row {item.row}: {item.action} {item.identifier} ({item.matched} matched)
                      </li>
                    ))}
                  </ul>
                  {summary.preview.length > 50 ? (
                    <p className="text-[11px] text-muted-foreground">
                      Showing first 50 of {summary.preview.length} rows.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
