import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GuestManager, type Ceremony, type Guest, type GuestGroup, type GuestInvitationStatus } from "@/components/app/guest-manager";
import { ImportSection } from "@/components/app/import-section";

export default async function PlannerGuestsPage({
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
  });

  if (!wedding) notFound();

  const [guests, groups, ceremonies, latestInvitations] = await Promise.all([
    db.guest.findMany({
      where: { weddingId },
      include: {
        groupMemberships: { select: { groupId: true } },
        ceremonyAssignments: { select: { ceremonyId: true, rsvp: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.guestGroup.findMany({
      where: { weddingId },
      orderBy: { createdAt: "asc" },
    }),
    db.ceremony.findMany({
      where: { weddingId },
      orderBy: { position: "asc" },
    }),
    db.invitation.findMany({
      where: { weddingId },
      select: { guestId: true, status: true, channel: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const invitationStatuses: GuestInvitationStatus[] = [];
  const seen = new Set<string>();
  for (const inv of latestInvitations) {
    if (!seen.has(inv.guestId)) {
      seen.add(inv.guestId);
      invitationStatuses.push({
        guestId: inv.guestId,
        status: inv.status as GuestInvitationStatus["status"],
        channel: inv.channel as GuestInvitationStatus["channel"],
      });
    }
  }

  const serializedGuests: Guest[] = guests.map((g) => ({
    id: g.id,
    name: g.name,
    guestType: g.guestType as Guest["guestType"],
    gender: g.gender as Guest["gender"],
    phone: g.phone,
    email: g.email,
    mealPref: g.mealPref,
    plusOneName: g.plusOneName,
    plusOnePhone: g.plusOnePhone,
    plusOneEmail: g.plusOneEmail,
    weddingId: g.weddingId,
    groupMemberships: g.groupMemberships,
    ceremonyAssignments: g.ceremonyAssignments.map((a) => ({
      ceremonyId: a.ceremonyId,
      rsvp: a.rsvp as string,
    })),
  }));

  const serializedGroups: GuestGroup[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    weddingId: g.weddingId,
  }));

  const serializedCeremonies: Ceremony[] = ceremonies.map((c) => ({
    id: c.id,
    type: c.type as Ceremony["type"],
    customLabel: c.customLabel,
    date: c.date?.toISOString() ?? null,
    weddingId: c.weddingId,
  }));

  return (
    <div className="flex flex-col">
      <header className="border-b border-border px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-tight">Invités</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {wedding.name} · {guests.length} invité{guests.length !== 1 ? "s" : ""}
            </p>
          </div>
          <ImportSection weddingId={weddingId} />
        </div>
      </header>

      <main className="flex-1 px-8 py-8">
        <GuestManager
          weddingId={weddingId}
          initialGuests={serializedGuests}
          initialGroups={serializedGroups}
          initialCeremonies={serializedCeremonies}
          invitationStatuses={invitationStatuses}
        />
      </main>
    </div>
  );
}
