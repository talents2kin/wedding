"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check, Users, Tag, CalendarDays, ChevronDown, Mail, MessageSquare, Phone } from "lucide-react";
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
  date: string | null;
  weddingId: string;
};

export type Guest = {
  id: string;
  name: string;
  guestType: "SINGLETON" | "COUPLE";
  gender: "MR" | "MME" | null;
  phone: string | null;
  email: string | null;
  mealPref: string | null;
  plusOneName: string | null;
  plusOnePhone: string | null;
  plusOneEmail: string | null;
  weddingId: string;
  groupMemberships: { groupId: string }[];
  ceremonyAssignments: { ceremonyId: string; rsvp: string }[];
};

export type GuestGroup = {
  id: string;
  name: string;
  weddingId: string;
};

type GuestFormState = {
  name: string;
  guestType: "SINGLETON" | "COUPLE";
  gender: "MR" | "MME" | null;
  phone: string;
  email: string;
  mealPref: string;
};

const BLANK_GUEST: GuestFormState = {
  name: "",
  guestType: "SINGLETON",
  gender: "MR",
  phone: "+243 ",
  email: "",
  mealPref: "",
};

type RsvpFilter = "PENDING" | "CONFIRMED" | "DECLINED" | null;

const RSVP_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  DECLINED: "Décliné",
};

function ceremonyLabel(c: Ceremony): string {
  if (c.type === "CUSTOM") return c.customLabel || "Personnalisé";
  const labels: Record<string, string> = { COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux" };
  return labels[c.type];
}

// ---------------------------------------------------------------------------
// GuestManager
// ---------------------------------------------------------------------------

// Latest invitation status per guestId
export type GuestInvitationStatus = {
  guestId: string;
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED";
  channel: "EMAIL" | "SMS" | "WHATSAPP";
};

const CHANNEL_ICONS = { EMAIL: Mail, SMS: Phone, WHATSAPP: MessageSquare };
const INV_STATUS: Record<string, { label: string; className: string }> = {
  SENT: { label: "Envoyé", className: "text-emerald-700 bg-emerald-500/10" },
  DELIVERED: { label: "Livré", className: "text-emerald-700 bg-emerald-500/10" },
  FAILED: { label: "Échoué", className: "text-destructive bg-destructive/10" },
  PENDING: { label: "En attente", className: "text-muted-foreground bg-muted" },
};

type Props = {
  weddingId: string;
  initialGuests: Guest[];
  initialGroups: GuestGroup[];
  initialCeremonies: Ceremony[];
  invitationStatuses?: GuestInvitationStatus[];
};

export function GuestManager({ weddingId, initialGuests, initialGroups, initialCeremonies, invitationStatuses = [] }: Props) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [groups, setGroups] = useState<GuestGroup[]>(initialGroups);
  const [isPending, startTransition] = useTransition();

  // ── Add guest form ────────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<GuestFormState>(BLANK_GUEST);
  const [addCeremonyIds, setAddCeremonyIds] = useState<string[]>([]);
  const [addError, setAddError] = useState<string | null>(null);

  // ── Edit guest ────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GuestFormState>(BLANK_GUEST);
  const [editCeremonyIds, setEditCeremonyIds] = useState<string[]>([]);

  // ── Add group form ────────────────────────────────────────────────────────
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupError, setGroupError] = useState<string | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [filterCeremony, setFilterCeremony] = useState<string | null>(null);
  const [filterRsvp, setFilterRsvp] = useState<RsvpFilter>(null);
  const [rsvpOpen, setRsvpOpen] = useState(false);

  const filteredGuests = guests.filter((g) => {
    if (filterGroup && !g.groupMemberships.some((m) => m.groupId === filterGroup)) return false;
    if (filterCeremony) {
      const assignment = g.ceremonyAssignments.find((a) => a.ceremonyId === filterCeremony);
      if (!assignment) return false;
      if (filterRsvp && assignment.rsvp !== filterRsvp) return false;
    } else if (filterRsvp) {
      if (!g.ceremonyAssignments.some((a) => a.rsvp === filterRsvp)) return false;
    }
    return true;
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  function startEdit(guest: Guest) {
    setEditingId(guest.id);
    setEditForm({
      name: guest.name,
      guestType: guest.guestType,
      gender: guest.gender,
      phone: guest.phone ?? "+243 ",
      email: guest.email ?? "",
      mealPref: guest.mealPref ?? "",
    });
    setEditCeremonyIds(guest.ceremonyAssignments.map((a) => a.ceremonyId));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(BLANK_GUEST);
    setEditCeremonyIds([]);
  }

  async function submitAdd() {
    setAddError(null);
    startTransition(async () => {
      const res = await fetch("/api/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingId,
          ...buildPayload(form),
          ...(addCeremonyIds.length > 0 && { ceremonyIds: addCeremonyIds }),
        }),
      });
      if (res.status === 402) {
        setAddError("Vous avez atteint la limite d'invités de votre forfait.");
        return;
      }
      if (!res.ok) {
        setAddError("Une erreur s'est produite.");
        return;
      }
      const guest: Guest = {
        ...(await res.json()),
        groupMemberships: [],
        ceremonyAssignments: addCeremonyIds.map((cid) => ({ ceremonyId: cid, rsvp: "PENDING" })),
      };
      setGuests((prev) => [...prev, guest]);
      setForm(BLANK_GUEST);
      setAddCeremonyIds([]);
      setShowAddForm(false);
    });
  }

  async function submitEdit(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/guest/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildPayload(editForm), ceremonyIds: editCeremonyIds }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setGuests((prev) =>
        prev.map((g) =>
          g.id === id
            ? {
                ...updated,
                groupMemberships: g.groupMemberships,
                ceremonyAssignments: editCeremonyIds.map((cid) => {
                  const existing = g.ceremonyAssignments.find((a) => a.ceremonyId === cid);
                  return existing ?? { ceremonyId: cid, rsvp: "PENDING" };
                }),
              }
            : g
        )
      );
      setEditingId(null);
      setEditCeremonyIds([]);
    });
  }

  async function cycleRsvp(guestId: string, ceremonyId: string, current: string) {
    const next = current === "PENDING" ? "CONFIRMED" : current === "CONFIRMED" ? "DECLINED" : "PENDING";
    // Optimistic update
    setGuests((prev) =>
      prev.map((g) =>
        g.id !== guestId
          ? g
          : {
              ...g,
              ceremonyAssignments: g.ceremonyAssignments.map((a) =>
                a.ceremonyId === ceremonyId ? { ...a, rsvp: next } : a
              ),
            }
      )
    );
    const res = await fetch("/api/rsvp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, ceremonyId, rsvp: next }),
    });
    if (!res.ok) {
      // Rollback
      setGuests((prev) =>
        prev.map((g) =>
          g.id !== guestId
            ? g
            : {
                ...g,
                ceremonyAssignments: g.ceremonyAssignments.map((a) =>
                  a.ceremonyId === ceremonyId ? { ...a, rsvp: current } : a
                ),
              }
        )
      );
    }
  }

  async function deleteGuest(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/guest/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setGuests((prev) => prev.filter((g) => g.id !== id));
    });
  }

  async function addGroup() {
    setGroupError(null);
    if (!groupName.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/guest-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId, name: groupName.trim() }),
      });
      if (!res.ok) {
        setGroupError("Erreur lors de la création du groupe.");
        return;
      }
      const group: GuestGroup = await res.json();
      setGroups((prev) => [...prev, group]);
      setGroupName("");
      setShowGroupForm(false);
    });
  }

  async function toggleMembership(guestId: string, groupId: string, isMember: boolean) {
    startTransition(async () => {
      const body = isMember ? { removeGuestId: guestId } : { addGuestId: guestId };
      const res = await fetch(`/api/guest-group/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      setGuests((prev) =>
        prev.map((g) => {
          if (g.id !== guestId) return g;
          return {
            ...g,
            groupMemberships: isMember
              ? g.groupMemberships.filter((m) => m.groupId !== groupId)
              : [...g.groupMemberships, { groupId }],
          };
        })
      );
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* ── Filter toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* All / group filters */}
        <button
          onClick={() => setFilterGroup(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            filterGroup === null && !filterCeremony && !filterRsvp
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          Tous ({guests.length})
        </button>

        {groups.map((grp) => {
          const count = guests.filter((g) => g.groupMemberships.some((m) => m.groupId === grp.id)).length;
          return (
            <button
              key={grp.id}
              onClick={() => setFilterGroup(grp.id === filterGroup ? null : grp.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filterGroup === grp.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <Tag className="mr-1 inline h-3 w-3" />
              {grp.name} ({count})
            </button>
          );
        })}

        {showGroupForm ? (
          <div className="flex items-center gap-1">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nom du groupe"
              className="h-7 w-36 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") addGroup();
                if (e.key === "Escape") { setShowGroupForm(false); setGroupName(""); }
              }}
              autoFocus
            />
            <button onClick={addGroup} disabled={isPending} className="rounded-md p-1 hover:bg-muted">
              <Check className="h-3.5 w-3.5 text-primary" />
            </button>
            <button onClick={() => { setShowGroupForm(false); setGroupName(""); }} className="rounded-md p-1 hover:bg-muted">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {groupError && <span className="text-xs text-destructive">{groupError}</span>}
          </div>
        ) : (
          <button
            onClick={() => setShowGroupForm(true)}
            className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="mr-1 inline h-3 w-3" />
            Groupe
          </button>
        )}

        {/* Ceremony filter */}
        {initialCeremonies.length > 0 && (
          <div className="flex items-center gap-1 border-l border-border pl-2">
            <CalendarDays className="h-3 w-3 text-muted-foreground/60" />
            {[null, ...initialCeremonies.map((c) => c.id)].map((cid) => {
              const c = initialCeremonies.find((x) => x.id === cid);
              return (
                <button
                  key={cid ?? "all"}
                  onClick={() => setFilterCeremony(cid)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                    filterCeremony === cid
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {cid === null ? "Toutes" : c ? ceremonyLabel(c) : cid}
                </button>
              );
            })}
          </div>
        )}

        {/* RSVP filter */}
        <div className="relative border-l border-border pl-2">
          <button
            onClick={() => setRsvpOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filterRsvp
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {filterRsvp ? RSVP_LABELS[filterRsvp] : "RSVP"}
            <ChevronDown className="h-3 w-3" />
          </button>
          {rsvpOpen && (
            <div className="absolute left-2 top-full z-10 mt-1 min-w-[120px] overflow-hidden rounded-lg border border-border bg-background shadow-md">
              {([null, "PENDING", "CONFIRMED", "DECLINED"] as const).map((v) => (
                <button
                  key={v ?? "all"}
                  onClick={() => { setFilterRsvp(v); setRsvpOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted",
                    filterRsvp === v && "font-medium text-primary"
                  )}
                >
                  {v === null ? "Tous" : RSVP_LABELS[v]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Guest list ────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        {filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium">Aucun invité</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {guests.length === 0
                ? "Ajoutez votre premier invité ci-dessous."
                : "Aucun invité ne correspond aux filtres sélectionnés."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredGuests.map((guest) =>
              editingId === guest.id ? (
                <li key={guest.id} className="px-6 py-4">
                  <GuestForm
                    form={editForm}
                    onFormChange={(f, v) => setEditForm((prev) => ({ ...prev, [f]: v }))}
                    groups={groups}
                    memberGroupIds={guest.groupMemberships.map((m) => m.groupId)}
                    onToggleMembership={(gid, isMember) => toggleMembership(guest.id, gid, isMember)}
                    ceremonies={initialCeremonies}
                    selectedCeremonyIds={editCeremonyIds}
                    onToggleCeremony={(cid) =>
                      setEditCeremonyIds((prev) =>
                        prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
                      )
                    }
                    onSubmit={() => submitEdit(guest.id)}
                    onCancel={cancelEdit}
                    isPending={isPending}
                    submitLabel="Enregistrer"
                  />
                </li>
              ) : (
                <li key={guest.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {guest.guestType === "SINGLETON" && guest.gender && (
                        <span className="text-muted-foreground mr-1">
                          {guest.gender === "MR" ? "M." : "Mme"}
                        </span>
                      )}
                      {guest.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[13px] text-muted-foreground">
                      {guest.email && <span>{guest.email}</span>}
                      {guest.phone && <span>{guest.phone}</span>}
                      {guest.mealPref && <span>{guest.mealPref}</span>}
                      {(() => {
                        const inv = invitationStatuses.find((s) => s.guestId === guest.id);
                        if (!inv) return null;
                        const cfg = INV_STATUS[inv.status];
                        const ChIcon = CHANNEL_ICONS[inv.channel];
                        return (
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", cfg.className)}>
                            <ChIcon className="h-2.5 w-2.5" />
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {guest.ceremonyAssignments.map((a) => {
                        const c = initialCeremonies.find((x) => x.id === a.ceremonyId);
                        return c ? (
                          <button
                            key={a.ceremonyId}
                            type="button"
                            title="Cliquer pour changer le statut RSVP"
                            onClick={() => cycleRsvp(guest.id, a.ceremonyId, a.rsvp)}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-70",
                              a.rsvp === "CONFIRMED" && "bg-emerald-500/10 text-emerald-700",
                              a.rsvp === "DECLINED" && "bg-destructive/10 text-destructive",
                              a.rsvp === "PENDING" && "bg-muted text-muted-foreground"
                            )}
                          >
                            {ceremonyLabel(c)} · {RSVP_LABELS[a.rsvp] ?? a.rsvp}
                          </button>
                        ) : null;
                      })}
                      {guest.groupMemberships.map((m) => {
                        const grp = groups.find((g) => g.id === m.groupId);
                        return grp ? (
                          <span key={m.groupId} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            <Tag className="mr-0.5 inline h-2.5 w-2.5" />
                            {grp.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => startEdit(guest)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteGuest(guest.id)}
                      disabled={isPending}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}

        {/* ── Add guest row ────────────────────────────────────────────────── */}
        {showAddForm ? (
          <div className="border-t border-border px-6 py-4">
            {addError && <p className="mb-3 text-sm text-destructive">{addError}</p>}
            <GuestForm
              form={form}
              onFormChange={(f, v) => setForm((prev) => ({ ...prev, [f]: v }))}
              groups={groups}
              memberGroupIds={[]}
              onToggleMembership={() => {}}
              ceremonies={initialCeremonies}
              selectedCeremonyIds={addCeremonyIds}
              onToggleCeremony={(cid) =>
                setAddCeremonyIds((prev) =>
                  prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
                )
              }
              onSubmit={submitAdd}
              onCancel={() => {
                setShowAddForm(false);
                setForm(BLANK_GUEST);
                setAddCeremonyIds([]);
                setAddError(null);
              }}
              isPending={isPending}
              submitLabel="Ajouter"
            />
          </div>
        ) : (
          <div className="border-t border-border px-6 py-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Ajouter un invité
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GuestForm
// ---------------------------------------------------------------------------

type GuestFormProps = {
  form: GuestFormState;
  onFormChange: (field: keyof GuestFormState, value: string) => void;
  groups: GuestGroup[];
  memberGroupIds: string[];
  onToggleMembership: (groupId: string, isMember: boolean) => void;
  ceremonies: Ceremony[];
  selectedCeremonyIds: string[];
  onToggleCeremony: (ceremonyId: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
};

function GuestForm({
  form,
  onFormChange,
  groups,
  memberGroupIds,
  onToggleMembership,
  ceremonies,
  selectedCeremonyIds,
  onToggleCeremony,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: GuestFormProps) {
  const isCouple = form.guestType === "COUPLE";

  return (
    <div className="flex flex-col gap-4">
      {/* Type + gender toggles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
          {(["SINGLETON", "COUPLE"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onFormChange("guestType", t)}
              className={cn(
                "px-3 py-1.5 transition-colors",
                form.guestType === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {t === "SINGLETON" ? "Individuel" : "Couple"}
            </button>
          ))}
        </div>

        {!isCouple && (
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
            {(["MR", "MME"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onFormChange("gender", g)}
                className={cn(
                  "px-3 py-1.5 transition-colors",
                  form.gender === g
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {g === "MR" ? "M." : "Mme"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <Label className="text-xs">Nom *</Label>
          <Input
            value={form.name}
            onChange={(e) => onFormChange("name", e.target.value)}
            placeholder="Prénom Nom"
            className="mt-1 h-8 text-sm"
            autoFocus
          />
        </div>
        <div>
          <Label className="text-xs">E-mail</Label>
          <Input
            value={form.email}
            onChange={(e) => onFormChange("email", e.target.value)}
            placeholder="email@exemple.com"
            type="email"
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Téléphone</Label>
          <Input
            value={form.phone}
            onChange={(e) => onFormChange("phone", e.target.value)}
            placeholder="+243 "
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Observation</Label>
          <Input
            value={form.mealPref}
            onChange={(e) => onFormChange("mealPref", e.target.value)}
            placeholder="Ne mange pas de viande, allergie…"
            className="mt-1 h-8 text-sm"
          />
        </div>
      </div>

      {ceremonies.length > 0 && (
        <div>
          <Label className="text-xs">Cérémonies</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ceremonies.map((c) => {
              const selected = selectedCeremonyIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggleCeremony(c.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {selected && <Check className="mr-1 inline h-2.5 w-2.5" />}
                  {ceremonyLabel(c)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div>
          <Label className="text-xs">Groupes</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {groups.map((grp) => {
              const isMember = memberGroupIds.includes(grp.id);
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => onToggleMembership(grp.id, isMember)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                    isMember
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {isMember && <Check className="mr-1 inline h-2.5 w-2.5" />}
                  {grp.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onSubmit}
          disabled={isPending || !form.name.trim()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
          Annuler
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function buildPayload(form: GuestFormState) {
  const { guestType, gender, ...textFields } = form;
  return {
    guestType,
    gender: guestType === "SINGLETON" ? gender : null,
    ...Object.fromEntries(
      Object.entries(textFields).map(([k, v]) => [k, (v as string).trim() || undefined])
    ),
  };
}
