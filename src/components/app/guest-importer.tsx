"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, X, ChevronRight, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ParsedRow = string[]; // raw cell values

type MappedRow = {
  name: string;
  phone: string;
  email: string;
  mealPref: string;
};

type ImportError = { row: number; message: string };

type Step = "upload" | "map" | "result";

const GUEST_FIELDS: { key: keyof MappedRow; label: string; required?: boolean }[] = [
  { key: "name", label: "Nom", required: true },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Téléphone" },
  { key: "mealPref", label: "Préférence repas" },
];

// ---------------------------------------------------------------------------
// GuestImporter
// ---------------------------------------------------------------------------

type Props = {
  weddingId: string;
  onImported?: (count: number) => void;
};

export function GuestImporter({ weddingId, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<keyof MappedRow, string>>({
    name: "",
    email: "",
    phone: "",
    mealPref: "",
  });
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: ImportError[];
    capError?: { overBy: number };
  } | null>(null);

  // ── File parsing ──────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setParseError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "csv" || ext === "txt") {
        await parseCsv(file);
      } else if (ext === "xlsx" || ext === "xls") {
        await parseExcel(file);
      } else {
        setParseError("Format non supporté. Veuillez utiliser un fichier CSV ou Excel (.xlsx).");
      }
    } catch {
      setParseError("Erreur lors de la lecture du fichier.");
    }
  }

  async function parseCsv(file: File) {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
    if (!result.data.length) {
      setParseError("Le fichier est vide.");
      return;
    }
    const [hdrs, ...dataRows] = result.data;
    setHeaders(hdrs);
    setRows(dataRows);
    autoMap(hdrs);
    setStep("map");
  }

  async function parseExcel(file: File) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!data.length) {
      setParseError("Le fichier est vide.");
      return;
    }
    const [hdrs, ...dataRows] = data.map((r) => r.map(String));
    setHeaders(hdrs);
    setRows(dataRows);
    autoMap(hdrs);
    setStep("map");
  }

  function autoMap(hdrs: string[]) {
    const lower = hdrs.map((h) => h.toLowerCase());
    const find = (...candidates: string[]) => {
      const idx = lower.findIndex((h) => candidates.some((c) => h.includes(c)));
      return idx >= 0 ? hdrs[idx] : "";
    };
    setMapping({
      name: find("nom", "name", "prénom", "prenom"),
      email: find("email", "e-mail", "mail", "courriel"),
      phone: find("phone", "tel", "téléphone", "telephone", "mobile"),
      mealPref: find("menu", "repas", "meal", "pref", "régime", "regime"),
    });
  }

  // ── Import ────────────────────────────────────────────────────────────────

  function buildMappedRows(): MappedRow[] {
    return rows.map((row) => ({
      name: getCell(row, mapping.name),
      email: getCell(row, mapping.email),
      phone: getCell(row, mapping.phone),
      mealPref: getCell(row, mapping.mealPref),
    }));
  }

  function getCell(row: ParsedRow, header: string): string {
    const idx = headers.indexOf(header);
    return idx >= 0 ? (row[idx] ?? "").trim() : "";
  }

  async function submitImport() {
    startTransition(async () => {
      const mappedRows = buildMappedRows();
      const res = await fetch("/api/guest/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId, rows: mappedRows }),
      });

      if (res.status === 402) {
        const data = await res.json();
        setImportResult({ imported: 0, errors: [], capError: { overBy: data.overBy } });
        setStep("result");
        return;
      }

      const data = await res.json();
      setImportResult({ imported: data.imported, errors: data.errors ?? [] });
      setStep("result");
      if (data.imported > 0) onImported?.(data.imported);
    });
  }

  function reset() {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({ name: "", email: "", phone: "", mealPref: "" });
    setParseError(null);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (step === "upload") {
    return (
      <div className="flex flex-col gap-3">
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border px-8 py-12 transition-colors hover:border-primary hover:bg-primary/4"
          )}
        >
          <Upload className="h-8 w-8 text-muted-foreground/50" />
          <div className="text-center">
            <p className="font-medium text-sm">Importer CSV ou Excel</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Glissez un fichier ou cliquez pour parcourir
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
        {parseError && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {parseError}
          </p>
        )}
      </div>
    );
  }

  if (step === "map") {
    const preview = rows.slice(0, 3);
    const canImport = !!mapping.name;

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button onClick={reset} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-medium">
            Associer les colonnes · {rows.length} ligne{rows.length !== 1 ? "s" : ""} détectée{rows.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Mapping grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {GUEST_FIELDS.map(({ key, label, required }) => (
            <div key={key}>
              <Label className="text-xs">
                {label} {required && <span className="text-destructive">*</span>}
              </Label>
              <select
                value={mapping[key]}
                onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">(ne pas importer)</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Preview table */}
        {preview.length > 0 && mapping.name && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {GUEST_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                    <th key={f.key} className="px-3 py-2 text-left font-medium text-muted-foreground">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.map((row, i) => (
                  <tr key={i}>
                    {GUEST_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                      <td key={f.key} className="px-3 py-2 text-muted-foreground">
                        {getCell(row, mapping[f.key]) || <span className="italic opacity-40">vide</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 3 && (
              <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
                … et {rows.length - 3} ligne{rows.length - 3 !== 1 ? "s" : ""} supplémentaire{rows.length - 3 !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={submitImport}
            disabled={!canImport || isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
            {isPending ? "Import en cours…" : `Importer ${rows.length} invité${rows.length !== 1 ? "s" : ""}`}
          </button>
          <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  // Result step
  const result = importResult!;
  return (
    <div className="flex flex-col gap-4">
      {result.capError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/40 dark:bg-amber-950/30">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Limite d&apos;invités atteinte
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            Cet import dépasserait votre forfait de {result.capError.overBy} invité{result.capError.overBy !== 1 ? "s" : ""}.
            Passez à Pro pour importer sans limite.
          </p>
          <button className="mt-3 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600">
            Passer à Pro
          </button>
        </div>
      ) : (
        <>
          {result.imported > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-5 py-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <p className="font-medium text-emerald-800 dark:text-emerald-300">
                {result.imported} invité{result.imported !== 1 ? "s" : ""} importé{result.imported !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4">
              <p className="mb-2 text-sm font-medium text-destructive">
                {result.errors.length} ligne{result.errors.length !== 1 ? "s" : ""} ignorée{result.errors.length !== 1 ? "s" : ""}
              </p>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-destructive/80">
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:bg-muted"
        >
          Nouvel import
        </button>
      </div>
    </div>
  );
}
