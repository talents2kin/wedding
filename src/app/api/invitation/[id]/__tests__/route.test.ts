import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/delivery", () => ({ deliver: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    invitation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    wedding: { findFirst: vi.fn() },
    guest: { findUnique: vi.fn() },
    ceremony: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deliver } from "@/lib/delivery";
import { POST } from "../route";

const SESSION = { user: { id: "u1", email: "a@b.com", name: "A" } };
const WEDDING = { id: "w1", senderName: "Marie & Pierre" };
const GUEST = { id: "g1", name: "Alice", gender: "MME", guestType: "SINGLETON", email: "alice@test.com", phone: null };
const CEREMONY = { id: "c1", type: "CIVIL", customLabel: null, date: new Date("2026-09-10"), venue: "Mairie", weddingId: "w1" };
const INVITATION = {
  id: "inv1",
  weddingId: "w1",
  guestId: "g1",
  ceremonyId: "c1",
  templateId: "classique",
  channel: "EMAIL",
  status: "FAILED",
  customBody: null,
};

function makePOST(id: string) {
  return new NextRequest(`http://localhost:3000/api/invitation/${id}`, { method: "POST" });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue(SESSION as never);
  vi.mocked(db.invitation.findUnique).mockResolvedValue(INVITATION as never);
  vi.mocked(db.wedding.findFirst).mockResolvedValue(WEDDING as never);
  vi.mocked(db.guest.findUnique).mockResolvedValue(GUEST as never);
  vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY as never);
  vi.mocked(deliver).mockResolvedValue({ success: true });
  vi.mocked(db.invitation.update).mockResolvedValue({ ...INVITATION, status: "SENT" } as never);
});

describe("POST /api/invitation/[id]/resend", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePOST("inv1"), { params: Promise.resolve({ id: "inv1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when invitation not found", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue(null as never);
    const res = await POST(makePOST("inv1"), { params: Promise.resolve({ id: "inv1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when not the wedding owner", async () => {
    vi.mocked(db.wedding.findFirst).mockResolvedValue(null as never);
    const res = await POST(makePOST("inv1"), { params: Promise.resolve({ id: "inv1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 409 when invitation is not FAILED", async () => {
    vi.mocked(db.invitation.findUnique).mockResolvedValue({ ...INVITATION, status: "SENT" } as never);
    const res = await POST(makePOST("inv1"), { params: Promise.resolve({ id: "inv1" }) });
    expect(res.status).toBe(409);
  });

  it("resends and updates status to SENT on success", async () => {
    const res = await POST(makePOST("inv1"), { params: Promise.resolve({ id: "inv1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("SENT");
    expect(vi.mocked(deliver)).toHaveBeenCalledTimes(1);
  });

  it("updates status to FAILED when delivery fails again", async () => {
    vi.mocked(deliver).mockResolvedValue({ success: false, error: "no_recipient" });
    vi.mocked(db.invitation.update).mockResolvedValue({ ...INVITATION, status: "FAILED" } as never);
    const res = await POST(makePOST("inv1"), { params: Promise.resolve({ id: "inv1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("FAILED");
  });
});
