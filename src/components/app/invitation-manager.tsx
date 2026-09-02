"use client";

import { useState, useTransition } from "react";
import { Send, Lock, CheckCircle2, XCircle, Clock, RotateCcw, Eye, ChevronRight, Mail, MessageSquare, Phone } from "lucide-react";
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

type Tab = "templates" | "send" | "status";

type Props = {
  weddingId: string;
  senderName: string;
  isPaidAccount: boolean;
  templates: Template[];
  ceremonies: Ceremony[];
  initialGuests: Guest[];
  initialInvitations: Invitation[];
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

  async function resend(inv: Invitation) {
    startTransition(async () => {
      const res = await fetch(`/api/invitation/${inv.id}`, { method: "POST" });
      if (!res.ok) return;
      const updated = await res.json();
      setInvitations((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: updated.status } : i)));
    });
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string }[] = [
    { id: "templates", label: "Modèles" },
    { id: "send", label: "Envoyer" },
    { id: "status", label: `Statuts (${invitations.length})` },
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

      {/* ── STATUTS tab ───────────────────────────────────────────────────── */}
      {tab === "status" && (
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
