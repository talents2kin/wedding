import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    guestCeremony: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    wedding: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PATCH } from "../route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION = { user: { id: "u1", email: "a@b.com", name: "A" } };

const GUEST_CEREMONY = {
  guestId: "g1",
  ceremonyId: "c1",
  rsvp: "PENDING",
  guest: { weddingId: "w1" },
};

const WEDDING = {
  id: "w1",
  name: "Test Wedding",
  senderName: null,
  coupleAccountId: "ca1",
  plannerAccountId: null,
  coupleAccount: { userId: "u1", guestCap: 50 },
  plannerAccount: null,
  collaborators: [],
};

function makePATCH(body: unknown) {
  return new NextRequest("http://localhost:3000/api/rsvp", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue(SESSION as never);
  vi.mocked(db.guestCeremony.findUnique).mockResolvedValue(GUEST_CEREMONY as never);
  vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
  vi.mocked(db.guestCeremony.update).mockResolvedValue({ ...GUEST_CEREMONY, rsvp: "CONFIRMED" } as never);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PATCH /api/rsvp", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PATCH(makePATCH({ guestId: "g1", ceremonyId: "c1", rsvp: "CONFIRMED" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing fields", async () => {
    const res = await PATCH(makePATCH({ guestId: "g1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid rsvp value", async () => {
    const res = await PATCH(makePATCH({ guestId: "g1", ceremonyId: "c1", rsvp: "MAYBE" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when guest-ceremony pair not found", async () => {
    vi.mocked(db.guestCeremony.findUnique).mockResolvedValue(null as never);
    const res = await PATCH(makePATCH({ guestId: "g1", ceremonyId: "c1", rsvp: "CONFIRMED" }));
    expect(res.status).toBe(404);
  });

  it("returns 403 when wedding not owned", async () => {
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null as never);
    const res = await PATCH(makePATCH({ guestId: "g1", ceremonyId: "c1", rsvp: "CONFIRMED" }));
    expect(res.status).toBe(403);
  });

  it("updates RSVP and returns the record", async () => {
    const res = await PATCH(makePATCH({ guestId: "g1", ceremonyId: "c1", rsvp: "CONFIRMED" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rsvp).toBe("CONFIRMED");
    expect(vi.mocked(db.guestCeremony.update)).toHaveBeenCalledWith({
      where: { guestId_ceremonyId: { guestId: "g1", ceremonyId: "c1" } },
      data: { rsvp: "CONFIRMED" },
    });
  });

  it("accepts DECLINED and PENDING values", async () => {
    vi.mocked(db.guestCeremony.update).mockResolvedValue({ ...GUEST_CEREMONY, rsvp: "DECLINED" } as never);
    const res = await PATCH(makePATCH({ guestId: "g1", ceremonyId: "c1", rsvp: "DECLINED" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rsvp).toBe("DECLINED");
  });
});
