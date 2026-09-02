import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CalendarDays,
  Users,
  CheckCircle2,
  Plus,
  Mail,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  // Planners have no couple account — send them to their own section
  const plannerAccount = await db.plannerAccount.findUnique({
    where: { userId: session.user.id },
  });
  if (plannerAccount) redirect("/weddings");

  const coupleAccount = await db.coupleAccount.findUnique({
    where: { userId: session.user.id },
    include: {
      wedding: {
        include: {
          _count: { select: { ceremonies: true, guests: true } },
        },
      },
    },
  });

  if (!coupleAccount?.wedding) redirect("/onboarding");

  const { wedding } = coupleAccount;

  const rsvpConfirmed = await db.guestCeremony.count({
    where: { ceremony: { weddingId: wedding.id }, rsvp: "CONFIRMED" },
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weddingDay = new Date(wedding.date);
  weddingDay.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil(
    (weddingDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const weddingDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(wedding.date));

  const { guests, ceremonies } = wedding._count;
  const guestCap = coupleAccount.guestCap;
  const guestPct = guestCap > 0 ? Math.min((guests / guestCap) * 100, 100) : 0;
  const rsvpPct = guests > 0 ? Math.round((rsvpConfirmed / guests) * 100) : null;

  const isNewWedding = ceremonies === 0;

  // ── Getting-started steps (shown when no ceremonies yet) ─────────────────
  const steps = [
    {
      num: 1,
      icon: CalendarDays,
      title: "Créer une cérémonie",
      body: "Ajoutez vos cérémonies — coutumière, civile ou religieuse. Chaque cérémonie a sa propre liste d'invités.",
      cta: { label: "Commencer", href: "/ceremonies" },
    },
    {
      num: 2,
      icon: Users,
      title: "Ajouter vos invités",
      body: "Importez ou saisissez votre liste. Vous pouvez segmenter par côté, par cérémonie, ou par groupe.",
      cta: null,
    },
    {
      num: 3,
      icon: Mail,
      title: "Envoyer les invitations",
      body: "Par e-mail, SMS ou WhatsApp. Chaque invité reçoit un lien personnalisé et un QR code unique.",
      cta: null,
    },
  ] as const;

  return (
    <div className="flex flex-col">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="border-b border-border px-8 py-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{wedding.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{weddingDate}</p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {/* Countdown badge */}
            {daysUntil > 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-primary/20 bg-primary/8 px-4 py-2 text-primary">
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  Grand jour
                </span>
                <span className="text-xl font-bold leading-none">
                  J &ndash; {daysUntil}
                </span>
              </div>
            ) : daysUntil === 0 ? (
              <div className="rounded-xl border border-primary/20 bg-primary/8 px-4 py-2 text-center text-primary">
                <span className="text-sm font-bold">Aujourd&apos;hui !</span>
              </div>
            ) : null}

            <Link
              href="/ceremonies"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              <Plus className="h-4 w-4" />
              Nouvelle cérémonie
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 px-8 py-8">
        {/* ── Stats — single grouped card, 3 internal columns ─────────── */}
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="grid grid-cols-3 divide-x divide-border">
            {/* Invités + capacity progress */}
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Invités</p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tabular-nums">{guests}</span>
                <span className="text-sm text-muted-foreground">/ {guestCap}</span>
              </div>
              {/* Capacity bar */}
              <div className="mt-3">
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-1 rounded-full bg-primary transition-all"
                    style={{ width: `${guestPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {guestPct === 0 ? "Aucun invité ajouté" : `${Math.round(guestPct)} % de capacité utilisée`}
                </p>
              </div>
            </div>

            {/* Confirmés */}
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Confirmés</p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tabular-nums">{rsvpConfirmed}</span>
                {rsvpPct !== null && (
                  <span className="text-sm text-muted-foreground">{rsvpPct} %</span>
                )}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {rsvpPct === null
                  ? "En attente de vos premiers invités"
                  : `sur ${guests} invité${guests > 1 ? "s" : ""}`}
              </p>
            </div>

            {/* Cérémonies */}
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CalendarDays className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Cérémonies</p>
              </div>
              <p className="text-3xl font-bold tabular-nums">{ceremonies}</p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {ceremonies === 0
                  ? "Coutumier, civil, religieux…"
                  : ceremonies === 1
                  ? "Cérémonie enregistrée"
                  : "Cérémonies enregistrées"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Getting-started guide (while no ceremonies) ──────────────── */}
        {isNewWedding && (
          <div className="mt-8">
            <h2 className="mb-5 text-sm font-semibold">Par où commencer ?</h2>
            <ol className="flex flex-col gap-0 divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
              {steps.map(({ num, icon: Icon, title, body, cta }) => (
                <li key={num} className="flex items-start gap-5 px-6 py-5">
                  {/* Step number */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 text-xs font-bold text-primary">
                    {num}
                  </div>

                  {/* Icon */}
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col">
                    <p className="font-medium leading-snug">{title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
                  </div>

                  {/* CTA or locked state */}
                  {cta ? (
                    <Link
                      href={cta.href}
                      className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
                    >
                      {cta.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="ml-auto shrink-0 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                      Bientôt
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}
