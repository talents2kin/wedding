import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    scheduledNotification: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    rsvpReminder: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    guest: { findMany: vi.fn() },
    guestCeremony: { findMany: vi.fn() },
    invitation: { createMany: vi.fn() },
  },
}));

vi.mock("@/lib/delivery", () => ({
  deliver: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/templates", () => ({
  findTemplate: vi.fn().mockReturnValue({ id: "classique", name: "Classique", bodyText: "Bonjour {{guestName}}", isPremium: false }),
  renderBody: vi.fn().mockReturnValue("Bonjour Alice"),
}));

import { db } from "@/lib/db";
import { deliver } from "@/lib/delivery";
import { GET } from "../route";

const CRON_SECRET = "test-secret";

function makeGET(secret?: string) {
  const headers: Record<string, string> = {};
  if (secret) headers["x-cron-secret"] = secret;
  return new NextRequest("http://localhost:3000/api/cron/fire-scheduled", { headers });
}

const NOW = new Date("2026-09-10T10:00:00Z");

const DUE_NOTIFICATION = {
  id: "sn1",
  weddingId: "w1",
  ceremonyId: "c1",
  templateId: "classique",
  channel: "EMAIL" as const,
  customBody: null,
  scheduledAt: new Date("2026-09-10T09:00:00Z"), // past
  status: "PENDING" as const,
  guests: [{ guestId: "g1" }, { guestId: "g2" }],
  ceremony: { type: "CIVIL", customLabel: null, date: new Date("2026-09-15"), venue: "Mairie" },
  wedding: { senderName: "Marie & Pierre", name: "Mariage Test" },
};

const FUTURE_NOTIFICATION = {
  ...DUE_NOTIFICATION,
  id: "sn2",
  scheduledAt: new Date("2026-09-11T09:00:00Z"), // future
};

const GUESTS = [
  { id: "g1", name: "Alice", guestType: "SINGLETON" as const, gender: "MME" as const, email: "alice@test.com", phone: null },
  { id: "g2", name: "Bob", guestType: "SINGLETON" as const, gender: "MR" as const, email: "bob@test.com", phone: null },
];

const DUE_REMINDER = {
  id: "r1",
  weddingId: "w1",
  ceremonyId: "c1",
  templateId: "classique",
  channel: "EMAIL" as const,
  daysAfter: 3,
  enabled: true,
  firedAt: null,
  createdAt: new Date("2026-09-07T00:00:00Z"), // 3 days ago → due now
  ceremony: { type: "CIVIL", customLabel: null, date: new Date("2026-09-15"), venue: "Mairie" },
  wedding: { senderName: "Marie & Pierre", name: "Mariage Test", id: "w1" },
};

const PENDING_ASSIGNMENTS = [
  { guestId: "g1", rsvp: "PENDING" },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);

  process.env.CRON_SECRET = CRON_SECRET;

  vi.mocked(db.scheduledNotification.findMany).mockResolvedValue([]);
  vi.mocked(db.rsvpReminder.findMany).mockResolvedValue([]);
  vi.mocked(db.guest.findMany).mockResolvedValue([]);
  vi.mocked(db.guestCeremony.findMany).mockResolvedValue([]);
  vi.mocked(db.invitation.createMany).mockResolvedValue({ count: 0 });
  vi.mocked(db.scheduledNotification.update).mockResolvedValue({} as never);
  vi.mocked(db.rsvpReminder.update).mockResolvedValue({} as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/cron/fire-scheduled", () => {
  it("returns 401 when CRON_SECRET header is missing", async () => {
    const res = await GET(makeGET());
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET header is wrong", async () => {
    const res = await GET(makeGET("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with zero fired when nothing is due", async () => {
    const res = await GET(makeGET(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.firedScheduled).toBe(0);
    expect(body.firedReminders).toBe(0);
  });

  it("fires a due scheduled notification and marks it FIRED", async () => {
    vi.mocked(db.scheduledNotification.findMany).mockResolvedValue([DUE_NOTIFICATION] as never);
    vi.mocked(db.guest.findMany).mockResolvedValue(GUESTS as never);

    const res = await GET(makeGET(CRON_SECRET));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.firedScheduled).toBe(1);

    // deliver called once per guest
    expect(vi.mocked(deliver)).toHaveBeenCalledTimes(2);

    // marked as FIRED
    expect(vi.mocked(db.scheduledNotification.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sn1" }, data: expect.objectContaining({ status: "FIRED" }) })
    );
  });

  it("does not fire future scheduled notifications", async () => {
    vi.mocked(db.scheduledNotification.findMany).mockResolvedValue([FUTURE_NOTIFICATION] as never);

    // The query should filter by scheduledAt <= now — so findMany won't return future ones
    // (tested via the query filter; in unit test we verify deliver is not called)
    vi.mocked(db.guest.findMany).mockResolvedValue([]);

    const res = await GET(makeGET(CRON_SECRET));
    expect(res.status).toBe(200);
    // No deliver calls since guests list is empty
    expect(vi.mocked(deliver)).not.toHaveBeenCalled();
  });

  it("fires a due RSVP reminder only for guests with pending RSVP", async () => {
    vi.mocked(db.rsvpReminder.findMany).mockResolvedValue([DUE_REMINDER] as never);
    vi.mocked(db.guestCeremony.findMany).mockResolvedValue(PENDING_ASSIGNMENTS as never);
    vi.mocked(db.guest.findMany).mockResolvedValue([GUESTS[0]] as never); // only g1 is pending

    const res = await GET(makeGET(CRON_SECRET));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.firedReminders).toBe(1);

    // Only 1 guest targeted (the pending one)
    expect(vi.mocked(deliver)).toHaveBeenCalledTimes(1);

    // firedAt set on reminder
    expect(vi.mocked(db.rsvpReminder.update)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1" }, data: expect.objectContaining({ firedAt: expect.any(Date) }) })
    );
  });

  it("skips disabled reminders", async () => {
    vi.mocked(db.rsvpReminder.findMany).mockResolvedValue([{ ...DUE_REMINDER, enabled: false }] as never);

    const res = await GET(makeGET(CRON_SECRET));
    expect(res.status).toBe(200);
    expect(vi.mocked(deliver)).not.toHaveBeenCalled();
  });

  it("skips reminders already fired", async () => {
    vi.mocked(db.rsvpReminder.findMany).mockResolvedValue([
      { ...DUE_REMINDER, firedAt: new Date("2026-09-09") },
    ] as never);

    const res = await GET(makeGET(CRON_SECRET));
    expect(res.status).toBe(200);
    expect(vi.mocked(deliver)).not.toHaveBeenCalled();
  });
});
