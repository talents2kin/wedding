import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GuestManager, type Ceremony, type Guest, type GuestGroup, type GuestInvitationStatus } from "@/components/app/guest-manager";
import { ImportSection } from "@/components/app/import-section";

export default async function GuestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const coupleAccount = await db.coupleAccount.findUnique({
    where: { userId: session.user.id },
    include: { wedding: true },
  });

  if (!coupleAccount?.wedding) redirect("/onboarding");

  const { wedding } = coupleAccount;

  const [guests, groups, ceremonies, latestInvitations] = await Promise.all([
    db.guest.findMany({
      where: { weddingId: wedding.id },
      include: {
        groupMemberships: { select: { groupId: true } },
        ceremonyAssignments: { select: { ceremonyId: true, rsvp: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.guestGroup.findMany({
      where: { weddingId: wedding.id },
      orderBy: { createdAt: "asc" },
    }),
    db.ceremony.findMany({
      where: { weddingId: wedding.id },
      orderBy: { position: "asc" },
    }),
    db.invitation.findMany({
      where: { weddingId: wedding.id },
      select: { guestId: true, status: true, channel: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Latest invitation per guest
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
    selfRegistered: g.selfRegistered,
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
              {guests.length} / {coupleAccount.guestCap} invités
            </p>
          </div>
          <ImportSection weddingId={wedding.id} />
        </div>
      </header>

      <main className="flex-1 px-8 py-8">
        <GuestManager
          weddingId={wedding.id}
          initialGuests={serializedGuests}
          initialGroups={serializedGroups}
          initialCeremonies={serializedCeremonies}
          invitationStatuses={invitationStatuses}
        />
      </main>
    </div>
  );
}
