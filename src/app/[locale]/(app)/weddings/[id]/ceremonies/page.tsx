import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CeremonyManager } from "@/components/app/ceremony-manager";

export default async function PlannerCeremoniesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const { id: weddingId } = await params;

  const wedding = await db.wedding.findFirst({
    where: {
      id: weddingId,
      plannerAccount: { userId: session.user.id },
    },
    include: { ceremonies: { orderBy: { position: "asc" } } },
  });

  if (!wedding) notFound();

  return (
    <div className="flex flex-col">
      <header className="border-b border-border px-8 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link
              href="/weddings"
              className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Mes mariages
            </Link>
            <h1 className="text-2xl font-bold leading-tight">Cérémonies</h1>
            <p className="mt-1 text-sm text-muted-foreground">{wedding.name}</p>
          </div>
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
            checkInToken: c.checkInToken ?? null,
          }))}
        />
      </main>
    </div>
  );
}
