import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { CeremonyManager } from "@/components/app/ceremony-manager";

export default async function CeremoniesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  // Planners access ceremonies per-wedding
  const plannerAccount = await db.plannerAccount.findUnique({
    where: { userId: session.user.id },
  });
  if (plannerAccount) redirect("/weddings");

  const coupleAccount = await db.coupleAccount.findUnique({
    where: { userId: session.user.id },
    include: { wedding: { include: { ceremonies: { orderBy: { position: "asc" } } } } },
  });

  if (!coupleAccount?.wedding) redirect("/onboarding");

  const { wedding } = coupleAccount;

  return (
    <div className="flex flex-col">
      <header className="border-b border-border px-8 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-tight">Cérémonies</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {wedding.name}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            ← Tableau de bord
          </Link>
        </div>
      </header>

      <main className="flex-1 px-8 py-8">
        <CeremonyManager
          weddingId={wedding.id}
          initial={wedding.ceremonies.map((c) => ({
            ...c,
            date: c.date?.toISOString() ?? null,
            customLabel: c.customLabel ?? null,
            venue: c.venue ?? null,
          }))}
        />
      </main>
    </div>
  );
}
