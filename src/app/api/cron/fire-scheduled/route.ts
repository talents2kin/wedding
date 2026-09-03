import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deliver } from "@/lib/delivery";
import { findTemplate, renderBody } from "@/lib/templates";

function ceremonyLabel(type: string, customLabel: string | null): string {
  if (customLabel) return customLabel;
  const labels: Record<string, string> = {
    CIVIL: "cérémonie civile",
    RELIGIEUX: "cérémonie religieuse",
    COUTUMIER: "cérémonie coutumière",
    CUSTOM: "cérémonie",
  };
  return labels[type] ?? type;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let firedScheduled = 0;
  let firedReminders = 0;

  // ---------------------------------------------------------------------------
  // Fire due scheduled notifications
  // ---------------------------------------------------------------------------

  const dueNotifications = await db.scheduledNotification.findMany({
    where: { status: "PENDING", scheduledAt: { lte: now } },
    include: {
      guests: true,
      ceremony: true,
      wedding: true,
    },
  });

  for (const notification of dueNotifications) {
    const guestIds = notification.guests.map((g: { guestId: string }) => g.guestId);
    const guests = await db.guest.findMany({ where: { id: { in: guestIds } } });

    const template = findTemplate(notification.templateId);
    const bodyText = template?.bodyText ?? "";

    for (const guest of guests) {
      const body = notification.customBody ?? renderBody(bodyText, {
        guestName: guest.name,
        genderPrefix: guest.gender === "MR" ? "M." : guest.gender === "MME" ? "Mme" : "",
        ceremonyLabel: ceremonyLabel(notification.ceremony.type, notification.ceremony.customLabel),
        date: formatDate(notification.ceremony.date),
        venue: notification.ceremony.venue ?? "",
        senderName: notification.wedding.senderName ?? "",
      });

      const to = notification.channel === "EMAIL" ? guest.email : guest.phone;
      await deliver({ channel: notification.channel, to, body, senderName: notification.wedding.senderName ?? "" });
    }

    await db.invitation.createMany({
      data: guests.map((g: { id: string }) => ({
        guestId: g.id,
        weddingId: notification.weddingId,
        ceremonyId: notification.ceremonyId,
        channel: notification.channel,
        templateId: notification.templateId,
        status: "SENT",
      })),
      skipDuplicates: true,
    });

    await db.scheduledNotification.update({
      where: { id: notification.id },
      data: { status: "FIRED", firedAt: now },
    });

    firedScheduled++;
  }

  // ---------------------------------------------------------------------------
  // Fire due RSVP reminders
  // ---------------------------------------------------------------------------

  const reminders = await db.rsvpReminder.findMany({
    where: { enabled: true, firedAt: null },
    include: {
      ceremony: true,
      wedding: true,
    },
  });

  for (const reminder of reminders) {
    // Check if the reminder is due: createdAt + daysAfter days <= now
    const dueAt = new Date(reminder.createdAt);
    dueAt.setDate(dueAt.getDate() + reminder.daysAfter);
    if (dueAt > now) continue;

    // Find guests with PENDING RSVP for this ceremony
    const pendingAssignments = await db.guestCeremony.findMany({
      where: { ceremonyId: reminder.ceremonyId, rsvp: "PENDING" },
    });

    if (pendingAssignments.length === 0) {
      await db.rsvpReminder.update({
        where: { id: reminder.id },
        data: { firedAt: now },
      });
      firedReminders++;
      continue;
    }

    const pendingGuestIds = pendingAssignments.map((a: { guestId: string }) => a.guestId);
    const guests = await db.guest.findMany({ where: { id: { in: pendingGuestIds } } });

    const template = findTemplate(reminder.templateId);
    const bodyText = template?.bodyText ?? "";

    for (const guest of guests) {
      const body = renderBody(bodyText, {
        guestName: guest.name,
        genderPrefix: guest.gender === "MR" ? "M." : guest.gender === "MME" ? "Mme" : "",
        ceremonyLabel: ceremonyLabel(reminder.ceremony.type, reminder.ceremony.customLabel),
        date: formatDate(reminder.ceremony.date),
        venue: reminder.ceremony.venue ?? "",
        senderName: reminder.wedding.senderName ?? "",
      });

      const to = reminder.channel === "EMAIL" ? guest.email : guest.phone;
      await deliver({ channel: reminder.channel, to, body, senderName: reminder.wedding.senderName ?? "" });
    }

    await db.rsvpReminder.update({
      where: { id: reminder.id },
      data: { firedAt: now },
    });

    firedReminders++;
  }

  return NextResponse.json({ firedScheduled, firedReminders });
}
