import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Plus, CalendarDays, Users, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

type WeddingStatus = "upcoming" | "in-progress" | "past";

function getStatus(date: Date): WeddingStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return "in-progress";
  if (d > today) return "upcoming";
  return "past";
}

const statusLabel: Record<WeddingStatus, string> = {
  upcoming: "À venir",
  "in-progress": "En cours",
  past: "Passé",
};

const statusClass: Record<WeddingStatus, string> = {
  upcoming: "bg-primary/10 text-primary",
  "in-progress": "bg-emerald-500/10 text-emerald-600",
  past: "bg-muted text-muted-foreground",
};

function fmt(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default async function WeddingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const plannerAccount = await db.plannerAccount.findUnique({
    where: { userId: session.user.id },
    include: {
      weddings: {
        include: {
          _count: { select: { guests: true } },
          ceremonies: { orderBy: { date: "asc" }, take: 1 },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!plannerAccount) redirect("/dashboard");

  const { weddings, weddingLimit } = plannerAccount;
  const atLimit = weddings.length >= weddingLimit;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-8 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-tight">Mes mariages</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {weddings.length} mariage{weddings.length !== 1 ? "s" : ""}
              {" · "}
              <Link
                href="/weddings/calendar"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Vue calendrier
              </Link>
            </p>
          </div>

          {atLimit ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/30">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Limite du forfait gratuit
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Passez à Pro pour créer plusieurs mariages
                </p>
              </div>
              <button className="ml-2 shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600">
                Passer à Pro
              </button>
            </div>
          ) : (
            <Link
              href="/planner/onboarding"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              <Plus className="h-4 w-4" />
              Nouveau mariage
            </Link>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-8 py-8">
        {weddings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium">Aucun mariage pour l&apos;instant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez votre premier mariage pour commencer.
            </p>
            <Link
              href="/planner/onboarding"
              className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              <Plus className="h-4 w-4" />
              Créer un mariage
            </Link>
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {weddings.map((wedding) => {
              const positionDate = wedding.ceremonies[0]?.date ?? wedding.date;
              const status = getStatus(positionDate);
              const nextCeremony = wedding.ceremonies[0]?.date;

              return (
                <li
                  key={wedding.id}
                  className="flex items-center gap-5 rounded-xl border border-border bg-background px-6 py-5 transition-shadow hover:shadow-sm"
                >
                  {/* Date block */}
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/8 text-primary">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      {new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(
                        new Date(wedding.date)
                      )}
                    </span>
                    <span className="text-2xl font-bold leading-none">
                      {new Date(wedding.date).getDate()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{wedding.name}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass[status]}`}
                      >
                        {statusLabel[status]}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-[13px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {nextCeremony
                          ? `Prochaine cérémonie : ${fmt(nextCeremony)}`
                          : "Aucune cérémonie planifiée"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {wedding._count.guests} invité
                        {wedding._count.guests !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
