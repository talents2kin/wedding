import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CalendarDays, Users, CheckCircle2, Plus } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

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

  // No wedding yet → go through onboarding
  if (!coupleAccount?.wedding) redirect("/onboarding");

  const { wedding } = coupleAccount;

  const rsvpConfirmed = await db.guest.count({
    where: { weddingId: wedding.id, rsvp: "CONFIRMED" },
  });

  const weddingDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(wedding.date));

  const stats = [
    {
      label: "Cérémonies",
      value: wedding._count.ceremonies,
      icon: CalendarDays,
      hint: "Coutumier, civil, religieux…",
    },
    {
      label: "Invités",
      value: wedding._count.guests,
      icon: Users,
      hint: `sur ${coupleAccount.guestCap} autorisés`,
    },
    {
      label: "Confirmés",
      value: rsvpConfirmed,
      icon: CheckCircle2,
      hint: "RSVP reçus",
    },
  ] as const;

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <header className="flex items-center justify-between border-b border-border px-8 py-5">
        <div>
          <h1 className="text-xl font-bold leading-tight">Tableau de bord</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {wedding.name} · {weddingDate}
          </p>
        </div>
        <Link
          href="/ceremonies"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          <Plus className="h-4 w-4" />
          Nouvelle cérémonie
        </Link>
      </header>

      <main className="flex-1 px-8 py-8">
        {/* Stats cards */}
        <div className="grid gap-5 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, hint }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-background p-6 shadow-[0_2px_12px_oklch(0.52_0.155_355/0.06)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-4xl font-bold tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </div>
          ))}
        </div>

        {/* Empty state — no ceremonies yet */}
        {wedding._count.ceremonies === 0 && (
          <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-border bg-background/60 px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarDays className="h-6 w-6" />
            </div>
            <h2 className="mb-1 text-base font-semibold">Aucune cérémonie pour l&apos;instant</h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Ajoutez votre première cérémonie — coutumière, civile ou religieuse — pour
              commencer à gérer vos invités.
            </p>
            <Link
              href="/ceremonies"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              <Plus className="h-4 w-4" />
              Créer une cérémonie
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
