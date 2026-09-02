import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TEMPLATES } from "@/lib/templates";
import { InvitationManager, type Ceremony, type Guest, type Invitation } from "@/components/app/invitation-manager";

export default async function PlannerInvitationsPage({
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

  const [guests, ceremonies, invitations] = await Promise.all([
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
        />
      </main>
    </div>
  );
}
