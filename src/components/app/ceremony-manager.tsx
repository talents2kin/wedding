"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CeremonyType = "COUTUMIER" | "CIVIL" | "RELIGIEUX" | "CUSTOM";

export type Ceremony = {
  id: string;
  type: CeremonyType;
  customLabel: string | null;
  date: string | null; // ISO string
  venue: string | null;
  position: number;
};

type FormState = {
  type: CeremonyType;
  customLabel: string;
  date: string;
  time: string;
  venue: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<CeremonyType, string> = {
  COUTUMIER: "Coutumier",
  CIVIL: "Civil",
  RELIGIEUX: "Religieux",
  CUSTOM: "Personnalisé",
};

const TYPE_COLORS: Record<CeremonyType, string> = {
  COUTUMIER: "bg-amber-500/10 text-amber-700 border-amber-200",
  CIVIL: "bg-blue-500/10 text-blue-700 border-blue-200",
  RELIGIEUX: "bg-purple-500/10 text-purple-700 border-purple-200",
  CUSTOM: "bg-muted text-muted-foreground border-border",
};

const BLANK_FORM: FormState = { type: "CIVIL", customLabel: "", date: "", time: "", venue: "" };

function displayLabel(c: Ceremony) {
  return c.type === "CUSTOM" ? (c.customLabel ?? "Personnalisé") : TYPE_LABELS[c.type];
}

function fmtDatetime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

function splitIso(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const date = d.toISOString().split("T")[0];
  const time = d.toISOString().split("T")[1].slice(0, 5);
  return { date, time };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypeSelector({
  value, onChange,
}: { value: CeremonyType; onChange: (t: CeremonyType) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["COUTUMIER", "CIVIL", "RELIGIEUX", "CUSTOM"] as CeremonyType[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            value === t
              ? "border-primary bg-primary/8 text-foreground"
              : "border-border bg-transparent text-muted-foreground hover:bg-muted"
          )}
        >
          {TYPE_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

function CeremonyForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-5">
      <div className="flex flex-col gap-1.5">
        <Label>Type de cérémonie</Label>
        <TypeSelector value={form.type} onChange={(t) => setForm((p) => ({ ...p, type: t }))} />
      </div>

      {form.type === "CUSTOM" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customLabel">Nom de la cérémonie</Label>
          <Input
            id="customLabel"
            value={form.customLabel}
            onChange={set("customLabel")}
            placeholder="ex. Brunch, Réception…"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cdate">Date</Label>
          <Input id="cdate" type="date" value={form.date} onChange={set("date")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ctime">Heure</Label>
          <Input id="ctime" type="time" value={form.time} onChange={set("time")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cvenue">Lieu</Label>
        <Input
          id="cvenue"
          value={form.venue}
          onChange={set("venue")}
          placeholder="ex. Mairie de Paris"
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" /> Annuler
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm dialog
// ---------------------------------------------------------------------------

function DeleteConfirmDialog({
  count,
  onConfirm,
  onCancel,
  deleting,
}: { count: number; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="text-base font-semibold">Supprimer la cérémonie ?</h2>
        {count > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {count} invité{count > 1 ? "s sont assignés" : " est assigné"} à cette
            cérémonie. Leur assignation sera supprimée.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex h-8 items-center rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground hover:bg-destructive/80 disabled:opacity-50"
          >
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CeremonyManager({ weddingId, initial }: { weddingId: string; initial: Ceremony[] }) {
  const [ceremonies, setCeremonies] = useState<Ceremony[]>(
    [...initial].sort((a, b) => a.position - b.position)
  );
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; count: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Create ───────────────────────────────────────────────────────────────

  async function handleCreate(form: FormState) {
    if (form.type === "CUSTOM" && !form.customLabel.trim()) {
      setFormError("Le nom de la cérémonie est requis.");
      return;
    }
    setSaving(true);
    setFormError(null);

    const res = await fetch("/api/ceremony", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weddingId, ...form, customLabel: form.customLabel || undefined }),
    });

    if (!res.ok) {
      setFormError("Impossible de créer la cérémonie.");
      setSaving(false);
      return;
    }

    const created: Ceremony = await res.json();
    setCeremonies((prev) => [...prev, created]);
    setAdding(false);
    setSaving(false);
  }

  // ── Update ───────────────────────────────────────────────────────────────

  async function handleUpdate(id: string, form: FormState) {
    if (form.type === "CUSTOM" && !form.customLabel.trim()) {
      setFormError("Le nom de la cérémonie est requis.");
      return;
    }
    setSaving(true);
    setFormError(null);

    const res = await fetch(`/api/ceremony/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, customLabel: form.customLabel || undefined }),
    });

    if (!res.ok) {
      setFormError("Impossible de mettre à jour la cérémonie.");
      setSaving(false);
      return;
    }

    const updated: Ceremony = await res.json();
    setCeremonies((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setEditingId(null);
    setSaving(false);
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async function handleDeleteClick(id: string) {
    // Try without force to detect guest assignments
    const res = await fetch(`/api/ceremony/${id}`, { method: "DELETE" });
    if (res.status === 409) {
      const { count } = await res.json();
      setConfirmDelete({ id, count });
      return;
    }
    if (res.ok) {
      setCeremonies((prev) => prev.filter((c) => c.id !== id));
    }
  }

  async function handleDeleteConfirm() {
    if (!confirmDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/ceremony/${confirmDelete.id}?force=true`, { method: "DELETE" });
    if (res.ok) {
      setCeremonies((prev) => prev.filter((c) => c.id !== confirmDelete.id));
    }
    setConfirmDelete(null);
    setDeleting(false);
  }

  // ── Reorder ──────────────────────────────────────────────────────────────

  async function move(index: number, direction: -1 | 1) {
    const next = [...ceremonies];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const reindexed = next.map((c, i) => ({ ...c, position: i }));
    setCeremonies(reindexed);

    startTransition(async () => {
      await fetch("/api/ceremony/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId, orderedIds: reindexed.map((c) => c.id) }),
      });
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {confirmDelete && (
        <DeleteConfirmDialog
          count={confirmDelete.count}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
          deleting={deleting}
        />
      )}

      {ceremonies.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="font-medium">Aucune cérémonie</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez votre première cérémonie pour commencer.
          </p>
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {ceremonies.map((ceremony, i) => (
          <li key={ceremony.id}>
            {editingId === ceremony.id ? (
              <CeremonyForm
                initial={{
                  type: ceremony.type,
                  customLabel: ceremony.customLabel ?? "",
                  ...splitIso(ceremony.date),
                  venue: ceremony.venue ?? "",
                }}
                onSave={(f) => handleUpdate(ceremony.id, f)}
                onCancel={() => { setEditingId(null); setFormError(null); }}
                saving={saving}
                error={formError}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-4">
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-20"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === ceremonies.length - 1}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-20"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Type badge */}
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    TYPE_COLORS[ceremony.type]
                  )}
                >
                  {displayLabel(ceremony)}
                </span>

                {/* Details */}
                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  {ceremony.date && (
                    <p className="text-sm font-medium">{fmtDatetime(ceremony.date)}</p>
                  )}
                  {ceremony.venue && (
                    <p className="text-xs text-muted-foreground">{ceremony.venue}</p>
                  )}
                  {!ceremony.date && !ceremony.venue && (
                    <p className="text-xs text-muted-foreground">Date et lieu à définir</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => { setEditingId(ceremony.id); setFormError(null); }}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(ceremony.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive/40 hover:bg-destructive/8 hover:text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      {adding ? (
        <CeremonyForm
          initial={BLANK_FORM}
          onSave={handleCreate}
          onCancel={() => { setAdding(false); setFormError(null); }}
          saving={saving}
          error={formError}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Ajouter une cérémonie
        </button>
      )}
    </div>
  );
}
