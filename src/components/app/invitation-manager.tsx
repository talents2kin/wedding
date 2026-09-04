"use client";

import { useState, useTransition } from "react";
import { Send, Lock, CheckCircle2, XCircle, Clock, RotateCcw, ChevronRight, Mail, MessageSquare, Phone, Download, Archive, CalendarClock, Bell, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { renderBody, type Template } from "@/lib/templates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Ceremony = {
  id: string;
  type: string;
  customLabel: string | null;
  date: string | null;
  venue: string | null;
};

export type Guest = {
  id: string;
  name: string;
  guestType: "SINGLETON" | "COUPLE";
  gender: "MR" | "MME" | null;
  email: string | null;
  phone: string | null;
};

export type Invitation = {
  id: string;
  guestId: string;
  ceremonyId: string;
  templateId: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED";
  sentAt: string | null;
  customBody: string | null;
};

export type ScheduledItem = {
  id: string;
  weddingId: string;
  ceremonyId: string;
  templateId: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  scheduledAt: string;
  status: "PENDING" | "FIRED" | "CANCELLED";
  customBody: string | null;
  ceremony: { type: string; customLabel: string | null; date: string | null };
  guests: { guestId: string }[];
};

export type RsvpReminderItem = {
  id: string;
  weddingId: string;
  ceremonyId: string;
  templateId: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  daysAfter: number;
  enabled: boolean;
  firedAt: string | null;
  createdAt: string;
  ceremony: { type: string; customLabel: string | null };
};

type Tab = "templates" | "send" | "status" | "planifier";

type Props = {
  weddingId: string;
  senderName: string;
  isPaidAccount: boolean;
  templates: Template[];
  ceremonies: Ceremony[];
  initialGuests: Guest[];
  initialInvitations: Invitation[];
  initialScheduled: ScheduledItem[];
  initialReminders: RsvpReminderItem[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ceremonyLabel(c: Ceremony): string {
  if (c.type === "CUSTOM") return c.customLabel ?? "Personnalisé";
  return { COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux" }[c.type] ?? c.type;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

const STATUS_CONFIG = {
  SENT: { label: "Envoyé", icon: CheckCircle2, className: "text-emerald-700 bg-emerald-500/10" },
  DELIVERED: { label: "Livré", icon: CheckCircle2, className: "text-emerald-700 bg-emerald-500/10" },
  FAILED: { label: "Échoué", icon: XCircle, className: "text-destructive bg-destructive/10" },
  PENDING: { label: "En attente", icon: Clock, className: "text-muted-foreground bg-muted" },
};

const CHANNEL_CONFIG = {
  EMAIL: { label: "E-mail", icon: Mail },
  SMS: { label: "SMS", icon: Phone },
  WHATSAPP: { label: "WhatsApp", icon: MessageSquare },
};

// ---------------------------------------------------------------------------
// InvitationManager
// ---------------------------------------------------------------------------

export function InvitationManager({
  weddingId,
  senderName,
  isPaidAccount,
  templates,
  ceremonies,
  initialGuests,
  initialInvitations,
  initialScheduled,
  initialReminders,
}: Props) {
  const [tab, setTab] = useState<Tab>("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedCeremonyId, setSelectedCeremonyId] = useState<string>(ceremonies[0]?.id ?? "");
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [channel, setChannel] = useState<"EMAIL" | "SMS" | "WHATSAPP">("EMAIL");
  const [customBody, setCustomBody] = useState<string>("");
  const [previewGuestId, setPreviewGuestId] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
  const [isPending, startTransition] = useTransition();

  // Planifier state
  const [scheduled, setScheduled] = useState<ScheduledItem[]>(initialScheduled);
  const [reminders, setReminders] = useState<RsvpReminderItem[]>(initialReminders);
  const [schedTemplate, setSchedTemplate] = useState<string>(templates[0]?.id ?? "");
  const [schedCeremonyId, setSchedCeremonyId] = useState<string>(ceremonies[0]?.id ?? "");
  const [schedChannel, setSchedChannel] = useState<"EMAIL" | "SMS" | "WHATSAPP">("EMAIL");
  const [schedGuestIds, setSchedGuestIds] = useState<string[]>([]);
  const [schedAt, setSchedAt] = useState<string>("");
  const [schedError, setSchedError] = useState<string | null>(null);
  const [reminderCeremonyId, setReminderCeremonyId] = useState<string>(ceremonies[0]?.id ?? "");
  const [reminderTemplate, setReminderTemplate] = useState<string>(templates[0]?.id ?? "");
  const [reminderChannel, setReminderChannel] = useState<"EMAIL" | "SMS" | "WHATSAPP">("EMAIL");
  const [reminderDays, setReminderDays] = useState<number>(3);

  const selectedCeremony = ceremonies.find((c) => c.id === selectedCeremonyId);
  const previewGuest = initialGuests.find((g) => g.id === previewGuestId) ?? initialGuests[0];

  // ── Preview body ──────────────────────────────────────────────────────────

  function buildPreviewBody(template: Template, guest: Guest | undefined, ceremony: Ceremony | undefined): string {
    if (!guest || !ceremony) return "";
    const genderPrefix =
      guest.guestType === "SINGLETON"
        ? guest.gender === "MR" ? "M." : guest.gender === "MME" ? "Mme" : ""
        : "";
    return renderBody(customBody || template.bodyText, {
      guestName: guest.name,
      genderPrefix,
      ceremonyLabel: ceremonyLabel(ceremony),
      date: formatDate(ceremony.date),
      venue: ceremony.venue ?? "",
      senderName,
    });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function toggleGuest(id: string) {
    setSelectedGuestIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    setSelectedGuestIds((prev) =>
      prev.length === initialGuests.length ? [] : initialGuests.map((g) => g.id)
    );
  }

  async function sendInvitations() {
    if (!selectedTemplate || selectedGuestIds.length === 0 || !selectedCeremonyId) return;
    setSendError(null);
    setSendResult(null);
    startTransition(async () => {
      const res = await fetch("/api/invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingId,
          ceremonyId: selectedCeremonyId,
          templateId: selectedTemplate.id,
          guestIds: selectedGuestIds,
          channel,
          ...(isPaidAccount && customBody ? { customBody } : {}),
        }),
      });
      if (!res.ok) {
        setSendError("Une erreur s'est produite lors de l'envoi.");
        return;
      }
      const result = await res.json();
      setSendResult(result);
      // Refresh invitation list
      const listRes = await fetch(`/api/invitation?weddingId=${weddingId}`);
      if (listRes.ok) {
        const { invitations: fresh } = await listRes.json();
        setInvitations(fresh);
      }
      setSelectedGuestIds([]);
    });
  }

  function downloadPdf(guestId: string, guestName: string, ceremonyId: string, templateId: string) {
    const params = new URLSearchParams({ guestId, ceremonyId, templateId });
    const a = document.createElement("a");
    a.href = `/api/pdf?${params}`;
    a.download = `invitation_${guestName.replace(/\s+/g, "_")}.pdf`;
    a.click();
  }

  function downloadBulkZip(ceremonyId: string, templateId: string) {
    const params = new URLSearchParams({ ceremonyId, templateId });
    const a = document.createElement("a");
    a.href = `/api/pdf/bulk?${params}`;
    a.download = "invitations.zip";
    a.click();
  }

  async function resend(inv: Invitation) {
    startTransition(async () => {
      const res = await fetch(`/api/invitation/${inv.id}`, { method: "POST" });
      if (!res.ok) return;
      const updated = await res.json();
      setInvitations((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: updated.status } : i)));
    });
  }

  // ── Planifier handlers ────────────────────────────────────────────────────

  async function scheduleNotification() {
    if (!schedTemplate || !schedCeremonyId || schedGuestIds.length === 0 || !schedAt) return;
    setSchedError(null);
    startTransition(async () => {
      const res = await fetch("/api/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingId,
          ceremonyId: schedCeremonyId,
          templateId: schedTemplate,
          channel: schedChannel,
          guestIds: schedGuestIds,
          scheduledAt: new Date(schedAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSchedError(err.error === "scheduled_at_must_be_future" ? "La date doit être dans le futur." : "Erreur lors de la planification.");
        return;
      }
      const listRes = await fetch(`/api/scheduled?weddingId=${weddingId}`);
      if (listRes.ok) {
        const { items } = await listRes.json();
        setScheduled(items);
      }
      setSchedGuestIds([]);
      setSchedAt("");
    });
  }

  async function cancelScheduled(id: string) {
    startTransition(async () => {
      await fetch(`/api/scheduled/${id}`, { method: "DELETE" });
      setScheduled((prev) => prev.filter((s) => s.id !== id));
    });
  }

  async function createReminder() {
    startTransition(async () => {
      const res = await fetch("/api/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weddingId,
          ceremonyId: reminderCeremonyId,
          templateId: reminderTemplate,
          channel: reminderChannel,
          daysAfter: reminderDays,
        }),
      });
      if (!res.ok) return;
      const listRes = await fetch(`/api/reminder?weddingId=${weddingId}`);
      if (listRes.ok) {
        const { reminders: fresh } = await listRes.json();
        setReminders(fresh);
      }
    });
  }

  async function toggleReminder(id: string, enabled: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/reminder/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) return;
      setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
    });
  }

  async function deleteReminder(id: string) {
    startTransition(async () => {
      await fetch(`/api/reminder/${id}`, { method: "DELETE" });
      setReminders((prev) => prev.filter((r) => r.id !== id));
    });
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string }[] = [
    { id: "templates", label: "Modèles" },
    { id: "send", label: "Envoyer" },
    { id: "status", label: `Statuts (${invitations.length})` },
    { id: "planifier", label: "Planifier" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MODÈLES tab ───────────────────────────────────────────────────── */}
      {tab === "templates" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const locked = tpl.isPremium && !isPaidAccount;
            const selected = selectedTemplate?.id === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() => {
                  if (!locked) {
                    setSelectedTemplate(tpl);
                    setCustomBody("");
                  }
                }}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-3 rounded-xl border p-5 transition-all",
                  locked ? "cursor-not-allowed opacity-60" : "hover:border-primary/50 hover:shadow-sm",
                  selected && "border-primary ring-1 ring-primary"
                )}
              >
                {tpl.isPremium && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    {locked && <Lock className="h-2.5 w-2.5" />}
                    Premium
                  </span>
                )}
                <div>
                  <p className="font-semibold">{tpl.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{tpl.description}</p>
                </div>
                {/* Preview snippet */}
                <pre className="overflow-hidden rounded-md bg-muted px-3 py-2 text-[11px] leading-relaxed text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {tpl.bodyText.slice(0, 120)}…
                </pre>
                {!locked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTemplate(tpl);
                      setCustomBody("");
                      setTab("send");
                    }}
                    className={cn(
                      "mt-auto flex items-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {selected ? "Sélectionné" : "Utiliser"}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                {locked && (
                  <p className="mt-auto text-xs text-amber-600">Passez à Premium pour débloquer</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ENVOYER tab ───────────────────────────────────────────────────── */}
      {tab === "send" && (
        <div className="flex flex-col gap-6">
          {/* Template selection */}
          <section className="rounded-xl border border-border bg-background p-5">
            <h3 className="mb-3 text-sm font-semibold">Modèle sélectionné</h3>
            {selectedTemplate ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{selectedTemplate.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => setTab("templates")}
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  Changer
                </button>
              </div>
            ) : (
              <button
                onClick={() => setTab("templates")}
                className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary"
              >
                Choisir un modèle →
              </button>
            )}
          </section>

          {selectedTemplate && (
            <>
              {/* Customization (paid) */}
              <section className="rounded-xl border border-border bg-background p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Personnaliser le texte</h3>
                  {!isPaidAccount && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                      <Lock className="h-2.5 w-2.5" />
                      Premium
                    </span>
                  )}
                </div>
                {isPaidAccount ? (
                  <div>
                    <Label className="text-xs">Corps du message (laissez vide pour utiliser le modèle)</Label>
                    <textarea
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      placeholder={selectedTemplate.bodyText}
                      rows={6}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Variables : {"{{guestName}} {{genderPrefix}} {{ceremonyLabel}} {{date}} {{venue}} {{senderName}}"}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    La personnalisation du texte, des couleurs et des polices est réservée aux comptes Premium.
                  </div>
                )}
              </section>

              {/* Preview */}
              <section className="rounded-xl border border-border bg-background p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Aperçu</h3>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Invité :</Label>
                    <select
                      value={previewGuestId || initialGuests[0]?.id}
                      onChange={(e) => setPreviewGuestId(e.target.value)}
                      className="h-7 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      {initialGuests.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap rounded-lg bg-muted px-4 py-3 text-sm leading-relaxed text-foreground">
                  {buildPreviewBody(selectedTemplate, previewGuest, selectedCeremony)}
                </pre>
              </section>

              {/* Cérémonie */}
              {ceremonies.length > 1 && (
                <section className="rounded-xl border border-border bg-background p-5">
                  <h3 className="mb-3 text-sm font-semibold">Cérémonie</h3>
                  <div className="flex flex-wrap gap-2">
                    {ceremonies.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCeremonyId(c.id)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          selectedCeremonyId === c.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {ceremonyLabel(c)}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Canal */}
              <section className="rounded-xl border border-border bg-background p-5">
                <h3 className="mb-3 text-sm font-semibold">Canal d&apos;envoi</h3>
                <div className="flex flex-wrap gap-2">
                  {(["EMAIL", "SMS", "WHATSAPP"] as const).map((ch) => {
                    const { label, icon: Icon } = CHANNEL_CONFIG[ch];
                    return (
                      <button
                        key={ch}
                        onClick={() => setChannel(ch)}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          channel === ch
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Guest selection */}
              <section className="rounded-xl border border-border bg-background p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Invités</h3>
                  <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                    {selectedGuestIds.length === initialGuests.length ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                </div>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {initialGuests.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 px-4 py-2.5">
                      <input
                        type="checkbox"
                        id={`g-${g.id}`}
                        checked={selectedGuestIds.includes(g.id)}
                        onChange={() => toggleGuest(g.id)}
                        className="h-4 w-4 rounded"
                      />
                      <label htmlFor={`g-${g.id}`} className="flex-1 cursor-pointer text-sm">
                        {g.guestType === "SINGLETON" && g.gender && (
                          <span className="mr-1 text-muted-foreground">{g.gender === "MR" ? "M." : "Mme"}</span>
                        )}
                        {g.name}
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {channel === "EMAIL" ? g.email ?? "—" : g.phone ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Send button */}
              {sendResult && (
                <div className={cn("rounded-lg px-4 py-3 text-sm", sendResult.failed > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                  {sendResult.sent > 0 && <p>✓ {sendResult.sent} invitation{sendResult.sent > 1 ? "s" : ""} envoyée{sendResult.sent > 1 ? "s" : ""}.</p>}
                  {sendResult.failed > 0 && <p>✗ {sendResult.failed} échec{sendResult.failed > 1 ? "s" : ""}. Consultez l&apos;onglet Statuts pour renvoyer.</p>}
                </div>
              )}
              {sendError && <p className="text-sm text-destructive">{sendError}</p>}

              <button
                onClick={sendInvitations}
                disabled={isPending || selectedGuestIds.length === 0 || !selectedCeremonyId}
                className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Envoyer à {selectedGuestIds.length} invité{selectedGuestIds.length !== 1 ? "s" : ""}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── PLANIFIER tab ─────────────────────────────────────────────────── */}
      {tab === "planifier" && (
        <div className="flex flex-col gap-8">

          {/* ── Scheduled sends ─────────────────────────────────────────── */}
          <section className="rounded-xl border border-border bg-background p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-primary" />
              Planifier un envoi
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Template */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Modèle</label>
                <select
                  value={schedTemplate}
                  onChange={(e) => setSchedTemplate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {templates.filter((t) => !t.isPremium || isPaidAccount).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Ceremony */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Cérémonie</label>
                <select
                  value={schedCeremonyId}
                  onChange={(e) => setSchedCeremonyId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {ceremonies.map((c) => (
                    <option key={c.id} value={c.id}>{ceremonyLabel(c)}</option>
                  ))}
                </select>
              </div>

              {/* Channel */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Canal</label>
                <div className="flex gap-2">
                  {(["EMAIL", "SMS", "WHATSAPP"] as const).map((ch) => {
                    const { label, icon: Icon } = CHANNEL_CONFIG[ch];
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setSchedChannel(ch)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          schedChannel === ch
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date/time */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Date et heure d&apos;envoi</label>
                <Input
                  type="datetime-local"
                  value={schedAt}
                  onChange={(e) => setSchedAt(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Guest selection */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Invités</label>
                <button
                  type="button"
                  onClick={() => setSchedGuestIds((prev) => prev.length === initialGuests.length ? [] : initialGuests.map((g) => g.id))}
                  className="text-xs text-primary hover:underline"
                >
                  {schedGuestIds.length === initialGuests.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>
              <ul className="max-h-48 overflow-y-auto divide-y divide-border rounded-lg border border-border">
                {initialGuests.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 px-4 py-2">
                    <input
                      type="checkbox"
                      id={`sg-${g.id}`}
                      checked={schedGuestIds.includes(g.id)}
                      onChange={() => setSchedGuestIds((prev) => prev.includes(g.id) ? prev.filter((x) => x !== g.id) : [...prev, g.id])}
                      className="h-4 w-4 rounded"
                    />
                    <label htmlFor={`sg-${g.id}`} className="flex-1 cursor-pointer text-sm">{g.name}</label>
                  </li>
                ))}
              </ul>
            </div>

            {schedError && <p className="mt-2 text-sm text-destructive">{schedError}</p>}

            <button
              type="button"
              onClick={scheduleNotification}
              disabled={isPending || schedGuestIds.length === 0 || !schedAt}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
            >
              <CalendarClock className="h-4 w-4" />
              Planifier l&apos;envoi
            </button>
          </section>

          {/* ── Pending scheduled list ──────────────────────────────────── */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Envois planifiés ({scheduled.length})
            </h3>
            {scheduled.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun envoi planifié pour le moment.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                {scheduled.map((s) => {
                  const { label: chLabel, icon: ChIcon } = CHANNEL_CONFIG[s.channel];
                  const cLabel = s.ceremony.customLabel ?? { CIVIL: "Civil", RELIGIOUS: "Religieux", TRADITIONAL: "Traditionnel", RECEPTION: "Réception" }[s.ceremony.type] ?? s.ceremony.type;
                  return (
                    <li key={s.id} className="flex items-center gap-4 px-5 py-3">
                      <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s.scheduledAt))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cLabel} · {chLabel} · {s.guests.length} invité{s.guests.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        <ChIcon className="h-3 w-3" />
                        {chLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => cancelScheduled(s.id)}
                        disabled={isPending}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Annuler
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ── RSVP Reminders ──────────────────────────────────────────── */}
          <section className="rounded-xl border border-border bg-background p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4 text-primary" />
              Rappels RSVP automatiques
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Envoyez automatiquement un rappel aux invités qui n&apos;ont pas encore répondu.
            </p>

            {/* Add reminder form */}
            <div className="mb-4 grid gap-4 sm:grid-cols-2 rounded-lg bg-muted/40 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Cérémonie</label>
                <select
                  value={reminderCeremonyId}
                  onChange={(e) => setReminderCeremonyId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {ceremonies.map((c) => (
                    <option key={c.id} value={c.id}>{ceremonyLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Modèle</label>
                <select
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {templates.filter((t) => !t.isPremium || isPaidAccount).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Canal</label>
                <div className="flex gap-2">
                  {(["EMAIL", "SMS", "WHATSAPP"] as const).map((ch) => {
                    const { label, icon: Icon } = CHANNEL_CONFIG[ch];
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setReminderChannel(ch)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          reminderChannel === ch
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Jours après création</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                  className="h-9 w-32 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={createReminder}
                  disabled={isPending}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
                >
                  <Bell className="h-4 w-4" />
                  Ajouter le rappel
                </button>
              </div>
            </div>

            {/* Reminder list */}
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun rappel configuré.</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {reminders.map((r) => {
                  const cLabel = r.ceremony.customLabel ?? { CIVIL: "Civil", RELIGIOUS: "Religieux", TRADITIONAL: "Traditionnel", RECEPTION: "Réception" }[r.ceremony.type] ?? r.ceremony.type;
                  const { label: chLabel } = CHANNEL_CONFIG[r.channel];
                  return (
                    <li key={r.id} className="flex items-center gap-4 px-5 py-3">
                      <Bell className={cn("h-4 w-4 shrink-0", r.enabled ? "text-primary" : "text-muted-foreground/40")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{cLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {chLabel} · {r.daysAfter} jour{r.daysAfter !== 1 ? "s" : ""} après création
                          {r.firedAt && " · Envoyé"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleReminder(r.id, !r.enabled)}
                        disabled={isPending || !!r.firedAt}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                        title={r.enabled ? "Désactiver" : "Activer"}
                      >
                        {r.enabled
                          ? <ToggleRight className="h-5 w-5 text-primary" />
                          : <ToggleLeft className="h-5 w-5" />
                        }
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteReminder(r.id)}
                        disabled={isPending}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── STATUTS tab ───────────────────────────────────────────────────── */}
      {tab === "status" && (
        <div className="flex flex-col gap-4">
          {/* Bulk download per ceremony */}
          {invitations.length > 0 && (() => {
            const ceremoniesWithInvitations = ceremonies.filter((c) =>
              invitations.some((inv) => inv.ceremonyId === c.id)
            );
            if (ceremoniesWithInvitations.length === 0) return null;
            return (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-5 py-3">
                <Archive className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">Télécharger en masse :</span>
                {ceremoniesWithInvitations.map((c) => {
                  const firstInv = invitations.find((inv) => inv.ceremonyId === c.id);
                  if (!firstInv) return null;
                  return (
                    <button
                      key={c.id}
                      onClick={() => downloadBulkZip(c.id, firstInv.templateId)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Download className="h-3 w-3" />
                      {ceremonyLabel(c)} (.zip)
                    </button>
                  );
                })}
              </div>
            );
          })()}

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          {invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Send className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-medium">Aucune invitation envoyée</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sélectionnez un modèle et envoyez vos premières invitations.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 text-left">Invité</th>
                  <th className="px-4 py-3 text-left">Canal</th>
                  <th className="px-4 py-3 text-left">Cérémonie</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Envoyé le</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitations.map((inv) => {
                  const guest = initialGuests.find((g) => g.id === inv.guestId);
                  const ceremony = ceremonies.find((c) => c.id === inv.ceremonyId);
                  const { label, icon: StatusIcon, className } = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.PENDING;
                  const { label: chLabel, icon: ChIcon } = CHANNEL_CONFIG[inv.channel];
                  return (
                    <tr key={inv.id}>
                      <td className="px-6 py-3 font-medium">{guest?.name ?? inv.guestId}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <ChIcon className="h-3 w-3" />
                          {chLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {ceremony ? ceremonyLabel(ceremony) : inv.ceremonyId}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", className)}>
                          <StatusIcon className="h-3 w-3" />
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {inv.sentAt ? formatDate(inv.sentAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => downloadPdf(inv.guestId, guest?.name ?? inv.guestId, inv.ceremonyId, inv.templateId)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                            title="Télécharger PDF"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                          {inv.status === "FAILED" && (
                            <button
                              onClick={() => resend(inv)}
                              disabled={isPending}
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Renvoyer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
