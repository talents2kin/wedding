"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, UserCheck, UserMinus, Download, Link, Copy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeatingCeremony = {
  id: string;
  type: string;
  customLabel: string | null;
  seatingShareToken: string | null;
};

export type SeatingGuest = {
  id: string;
  name: string;
  gender: "MR" | "MME" | null;
  guestType: "SINGLETON" | "COUPLE";
};

export type SeatingTable = {
  id: string;
  name: string;
  capacity: number;
  position: number;
  seats: { guest: SeatingGuest }[];
};

type Props = {
  weddingId: string;
  ceremonies: SeatingCeremony[];
  initialTables: SeatingTable[];
  confirmedGuests: SeatingGuest[];
};

// ---------------------------------------------------------------------------
// SeatingManager
// ---------------------------------------------------------------------------

export function SeatingManager({ weddingId, ceremonies, initialTables, confirmedGuests }: Props) {
  const [selectedCeremonyId, setSelectedCeremonyId] = useState<string>(ceremonies[0]?.id ?? "");
  const [tables, setTables] = useState<SeatingTable[]>(initialTables);
  const [ceremonies_, setCeremonies] = useState<SeatingCeremony[]>(ceremonies);

  const [newTableName, setNewTableName] = useState("");
  const [newTableCap, setNewTableCap] = useState(8);
  const [editTableId, setEditTableId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCap, setEditCap] = useState(8);

  const [assigningGuestId, setAssigningGuestId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(
    ceremonies[0]?.seatingShareToken ? `/fr/seating/${ceremonies[0].seatingShareToken}` : null
  );
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const ceremony = ceremonies_.find((c) => c.id === selectedCeremonyId);
  const ceremonyTables = tables
    .filter((t) => t.seats !== undefined)
    .sort((a, b) => a.position - b.position);

  // Guests who are in this ceremony's tables
  const seatedGuestIds = new Set(ceremonyTables.flatMap((t) => t.seats.map((s) => s.guest.id)));
  const unseatedGuests = confirmedGuests.filter((g) => !seatedGuestIds.has(g.id));

  function genderLabel(g: SeatingGuest) {
    if (g.guestType === "SINGLETON" && g.gender) return g.gender === "MR" ? "M. " : "Mme ";
    return "";
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function createTable() {
    if (!newTableName.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId, ceremonyId: selectedCeremonyId, name: newTableName.trim(), capacity: newTableCap }),
      });
      if (!res.ok) return;
      const table = await res.json();
      setTables((prev) => [...prev, table]);
      setNewTableName("");
      setNewTableCap(8);
    });
  }

  async function deleteTable(tableId: string) {
    startTransition(async () => {
      await fetch(`/api/table/${tableId}`, { method: "DELETE" });
      setTables((prev) => prev.filter((t) => t.id !== tableId));
    });
  }

  async function saveTableEdit(tableId: string) {
    startTransition(async () => {
      const res = await fetch(`/api/table/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), capacity: editCap }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setTables((prev) => prev.map((t) => (t.id === tableId ? updated : t)));
      setEditTableId(null);
    });
  }

  async function assignGuest(tableId: string) {
    if (!assigningGuestId) return;
    startTransition(async () => {
      const res = await fetch(`/api/table/${tableId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: assigningGuestId }),
      });
      if (!res.ok) return;
      const guest = confirmedGuests.find((g) => g.id === assigningGuestId);
      if (!guest) return;
      setTables((prev) => prev.map((t) => {
        // Remove guest from any previous table
        const filtered = t.seats.filter((s) => s.guest.id !== assigningGuestId);
        if (t.id === tableId) return { ...t, seats: [...filtered, { guest }] };
        return { ...t, seats: filtered };
      }));
      setAssigningGuestId(null);
    });
  }

  async function unassignGuest(tableId: string, guestId: string) {
    startTransition(async () => {
      await fetch(`/api/table/${tableId}/assign/${guestId}`, { method: "DELETE" });
      setTables((prev) => prev.map((t) =>
        t.id === tableId ? { ...t, seats: t.seats.filter((s) => s.guest.id !== guestId) } : t
      ));
    });
  }

  async function generateShareLink() {
    startTransition(async () => {
      const res = await fetch(`/api/ceremony/${selectedCeremonyId}/seating-share`, { method: "POST" });
      if (!res.ok) return;
      const { url } = await res.json();
      setShareUrl(url);
      setCeremonies((prev) => prev.map((c) =>
        c.id === selectedCeremonyId ? { ...c, seatingShareToken: url.split("/").pop() ?? null } : c
      ));
    });
  }

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(window.location.origin + shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadPdf() {
    const a = document.createElement("a");
    a.href = `/api/seating/pdf?ceremonyId=${selectedCeremonyId}`;
    a.download = "plan-de-table.pdf";
    a.click();
  }

  // ── Ceremony selector ─────────────────────────────────────────────────────

  function selectCeremony(id: string) {
    setSelectedCeremonyId(id);
    const c = ceremonies_.find((c) => c.id === id);
    setShareUrl(c?.seatingShareToken ? `/fr/seating/${c.seatingShareToken}` : null);
    setAssigningGuestId(null);
  }

  const totalSeated = seatedGuestIds.size;
  const totalCapacity = ceremonyTables.reduce((s, t) => s + t.capacity, 0);

  return (
    <div className="flex flex-col gap-6">

      {/* Ceremony selector */}
      {ceremonies_.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {ceremonies_.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCeremony(c.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                selectedCeremonyId === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {c.customLabel ?? { COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux", CUSTOM: "Personnalisé" }[c.type] ?? c.type}
            </button>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Summary */}
        <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{totalSeated} / {totalCapacity} places</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Share link */}
          {shareUrl ? (
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              {copied ? <><Copy className="h-3 w-3" /> Copié !</> : <><Link className="h-3 w-3" /> Lien partagé</>}
            </button>
          ) : (
            <button
              onClick={generateShareLink}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              <Link className="h-3 w-3" /> Créer lien
            </button>
          )}

          {/* PDF export */}
          <button
            onClick={downloadPdf}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <Download className="h-3 w-3" /> Exporter PDF
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">

        {/* ── Tables panel ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Add table form */}
          <div className="flex items-end gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <div className="flex-1">
              <Label className="text-xs">Nom de la table</Label>
              <Input
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Table des mariés"
                className="mt-1 h-9 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") createTable(); }}
              />
            </div>
            <div className="w-24">
              <Label className="text-xs">Capacité</Label>
              <Input
                type="number"
                min={1}
                value={newTableCap}
                onChange={(e) => setNewTableCap(Number(e.target.value))}
                className="mt-1 h-9 text-sm"
              />
            </div>
            <button
              onClick={createTable}
              disabled={isPending || !newTableName.trim()}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>

          {/* Table cards */}
          {ceremonyTables.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <Users className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-medium text-sm">Aucune table créée</p>
              <p className="mt-1 text-xs text-muted-foreground">Ajoutez une table ci-dessus pour commencer.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {ceremonyTables.map((table) => {
                const isEditing = editTableId === table.id;
                const seated = table.seats.length;
                const isFull = seated >= table.capacity;

                return (
                  <div key={table.id} className="flex flex-col rounded-xl border border-border bg-background overflow-hidden">
                    {/* Table header */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 bg-primary/10 px-4 py-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 text-sm flex-1"
                          onKeyDown={(e) => { if (e.key === "Enter") saveTableEdit(table.id); if (e.key === "Escape") setEditTableId(null); }}
                          autoFocus
                        />
                        <Input
                          type="number"
                          value={editCap}
                          onChange={(e) => setEditCap(Number(e.target.value))}
                          className="h-7 w-16 text-sm"
                        />
                        <button onClick={() => saveTableEdit(table.id)} className="text-xs font-medium text-primary">OK</button>
                        <button onClick={() => setEditTableId(null)} className="text-xs text-muted-foreground">Annuler</button>
                      </div>
                    ) : (
                      <div
                        className="flex cursor-pointer items-center gap-2 bg-primary px-4 py-2.5"
                        onClick={() => { setEditTableId(table.id); setEditName(table.name); setEditCap(table.capacity); }}
                      >
                        <span className="flex-1 text-sm font-semibold text-primary-foreground">{table.name}</span>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          isFull ? "bg-white/20 text-white" : "bg-white/30 text-white"
                        )}>
                          {seated}/{table.capacity}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTable(table.id); }}
                          disabled={isPending}
                          className="ml-1 rounded p-0.5 hover:bg-white/20"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-white/70" />
                        </button>
                      </div>
                    )}

                    {/* Seated guests */}
                    <ul className="flex-1 divide-y divide-border">
                      {table.seats.map((seat) => (
                        <li key={seat.guest.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                          <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span className="flex-1">{genderLabel(seat.guest)}{seat.guest.name}</span>
                          <button
                            onClick={() => unassignGuest(table.id, seat.guest.id)}
                            disabled={isPending}
                            className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                            title="Retirer"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                      {table.seats.length === 0 && (
                        <li className="px-4 py-3 text-xs text-muted-foreground italic">Table vide</li>
                      )}
                    </ul>

                    {/* Assign button */}
                    {!isFull && assigningGuestId && (
                      <button
                        onClick={() => assignGuest(table.id)}
                        disabled={isPending}
                        className="border-t border-border px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5"
                      >
                        Placer ici →
                      </button>
                    )}
                    {!isFull && !assigningGuestId && unseatedGuests.length > 0 && (
                      <div className="border-t border-dashed border-border px-4 py-1.5 text-[11px] text-muted-foreground/50 text-center">
                        Sélectionnez un invité →
                      </div>
                    )}
                    {isFull && (
                      <div className="border-t border-border px-4 py-1.5 text-[11px] text-center text-amber-600">
                        Table complète
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Unassigned guests panel ──────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Non placés ({unseatedGuests.length})</h3>
            {assigningGuestId && (
              <button onClick={() => setAssigningGuestId(null)} className="text-xs text-muted-foreground hover:underline">Annuler</button>
            )}
          </div>

          {unseatedGuests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
              <UserCheck className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700">Tous placés !</p>
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
              {unseatedGuests.map((guest) => (
                <li
                  key={guest.id}
                  onClick={() => setAssigningGuestId(assigningGuestId === guest.id ? null : guest.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm transition-colors",
                    assigningGuestId === guest.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="flex-1">{genderLabel(guest)}{guest.name}</span>
                  {assigningGuestId === guest.id && <span className="text-xs text-primary">→ choisir table</span>}
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11px] text-muted-foreground">
            Cliquez sur un invité, puis sur &laquo;&nbsp;Placer ici&nbsp;&raquo; dans la table souhaitée.
          </p>
        </div>
      </div>
    </div>
  );
}
