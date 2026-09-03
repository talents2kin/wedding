import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SeatingManager, type SeatingCeremony, type SeatingGuest, type SeatingTable } from "@/components/app/seating-manager";

export default async function PlannerSeatingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const { id: weddingId } = await params;

  const wedding = await db.wedding.findFirst({
    where: { id: weddingId, plannerAccount: { userId: session.user.id } },
  });

  if (!wedding) notFound();

  const [ceremonies, tables, confirmedAssignments] = await Promise.all([
    db.ceremony.findMany({
      where: { weddingId },
      orderBy: { position: "asc" },
    }),
    db.table.findMany({
      where: { weddingId },
      orderBy: { position: "asc" },
      include: {
        seats: {
          include: {
            guest: { select: { id: true, name: true, gender: true, guestType: true } },
          },
        },
      },
    }),
    db.guestCeremony.findMany({
      where: { rsvp: "CONFIRMED", ceremony: { weddingId } },
      include: {
        guest: { select: { id: true, name: true, gender: true, guestType: true } },
      },
    }),
  ]);

  const serializedCeremonies: SeatingCeremony[] = ceremonies.map((c) => ({
    id: c.id,
    type: c.type,
    customLabel: c.customLabel,
    seatingShareToken: c.seatingShareToken,
  }));

  const serializedTables: SeatingTable[] = tables.map((t) => ({
    id: t.id,
    name: t.name,
    capacity: t.capacity,
    position: t.position,
    seats: t.seats.map((s) => ({
      guest: {
        id: s.guest.id,
        name: s.guest.name,
        gender: s.guest.gender as SeatingGuest["gender"],
        guestType: s.guest.guestType as SeatingGuest["guestType"],
      },
    })),
  }));

  const confirmedGuests: SeatingGuest[] = confirmedAssignments
    .filter((a, i, arr) => arr.findIndex((b) => b.guestId === a.guestId) === i)
    .map((a) => ({
      id: a.guest.id,
      name: a.guest.name,
      gender: a.guest.gender as SeatingGuest["gender"],
      guestType: a.guest.guestType as SeatingGuest["guestType"],
    }));

  return (
    <div className="flex flex-col">
      <header className="border-b border-border px-8 py-6">
        <h1 className="text-2xl font-bold leading-tight">Plan de table</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {wedding.name} · Placez vos invités confirmés
        </p>
      </header>
      <main className="flex-1 px-8 py-8">
        <SeatingManager
          weddingId={weddingId}
          ceremonies={serializedCeremonies}
          initialTables={serializedTables}
          confirmedGuests={confirmedGuests}
        />
      </main>
    </div>
  );
}
