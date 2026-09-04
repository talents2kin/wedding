import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess } from "@/lib/wedding-access";
import { TEMPLATES } from "@/lib/templates";
import { InvitationManager, type Ceremony, type Guest, type Invitation, type ScheduledItem, type RsvpReminderItem } from "@/components/app/invitation-manager";

export default async function PlannerInvitationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const { id: weddingId } = await params;

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access) notFound();

  const wedding = await db.wedding.findUnique({ where: { id: weddingId } });
  if (!wedding) notFound();

  const [guests, ceremonies, invitations, scheduledItems, reminderItems] = await Promise.all([
    db.guest.findMany({
      where: { weddingId },
      select: { id: true, name: true, guestType: true, gender: true, email: true, phone: true },
      orderBy: { createdAt: "asc" },
    }),
    db.ceremony.findMany({
      where: { weddingId },
      orderBy: { position: "asc" },
    }),
    db.invitation.findMany({
      where: { weddingId },
      orderBy: { createdAt: "desc" },
    }),
    db.scheduledNotification.findMany({
      where: { weddingId, status: "PENDING" },
      include: { ceremony: { select: { type: true, customLabel: true, date: true } }, guests: { select: { guestId: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    db.rsvpReminder.findMany({
      where: { weddingId },
      include: { ceremony: { select: { type: true, customLabel: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const serializedGuests: Guest[] = guests.map((g) => ({
    id: g.id,
    name: g.name,
    guestType: g.guestType as Guest["guestType"],
    gender: g.gender as Guest["gender"],
    email: g.email,
    phone: g.phone,
  }));

  const serializedCeremonies: Ceremony[] = ceremonies.map((c) => ({
    id: c.id,
    type: c.type,
    customLabel: c.customLabel,
    date: c.date?.toISOString() ?? null,
    venue: c.venue,
  }));

  const serializedInvitations: Invitation[] = invitations.map((i) => ({
    id: i.id,
    guestId: i.guestId,
    ceremonyId: i.ceremonyId,
    templateId: i.templateId,
    channel: i.channel as Invitation["channel"],
    status: i.status as Invitation["status"],
    sentAt: i.sentAt?.toISOString() ?? null,
    customBody: i.customBody,
  }));

  const serializedScheduled: ScheduledItem[] = scheduledItems.map((s) => ({
    id: s.id,
    weddingId: s.weddingId,
    ceremonyId: s.ceremonyId,
    templateId: s.templateId,
    channel: s.channel as ScheduledItem["channel"],
    scheduledAt: s.scheduledAt.toISOString(),
    status: s.status as ScheduledItem["status"],
    customBody: s.customBody,
    ceremony: { type: s.ceremony.type, customLabel: s.ceremony.customLabel, date: s.ceremony.date?.toISOString() ?? null },
    guests: s.guests.map((g) => ({ guestId: g.guestId })),
  }));

  const serializedReminders: RsvpReminderItem[] = reminderItems.map((r) => ({
    id: r.id,
    weddingId: r.weddingId,
    ceremonyId: r.ceremonyId,
    templateId: r.templateId,
    channel: r.channel as RsvpReminderItem["channel"],
    daysAfter: r.daysAfter,
    enabled: r.enabled,
    firedAt: r.firedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    ceremony: { type: r.ceremony.type, customLabel: r.ceremony.customLabel },
  }));

  // Planners are paid accounts — customisation unlocked
  const isPaidAccount = true;

  return (
    <div className="flex flex-col">
      <header className="border-b border-border px-8 py-6">
        <h1 className="text-2xl font-bold leading-tight">Invitations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {wedding.name} · Envoyez vos invitations par e-mail, SMS ou WhatsApp
        </p>
      </header>

      <main className="flex-1 px-8 py-8">
        <InvitationManager
          weddingId={weddingId}
          senderName={wedding.senderName ?? wedding.name}
          isPaidAccount={isPaidAccount}
          templates={TEMPLATES}
          ceremonies={serializedCeremonies}
          initialGuests={serializedGuests}
          initialInvitations={serializedInvitations}
          initialScheduled={serializedScheduled}
          initialReminders={serializedReminders}
        />
      </main>
    </div>
  );
}
