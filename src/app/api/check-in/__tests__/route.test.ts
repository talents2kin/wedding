import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    ceremony: { findUnique: vi.fn() },
    guestCeremony: { findUnique: vi.fn() },
    checkIn: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

// qrPayload is a pure helper — import the real one
vi.mock("@/lib/pdf", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/pdf")>();
  return { qrPayload: real.qrPayload };
});

import { db } from "@/lib/db";
import { qrPayload } from "@/lib/pdf";
import { POST } from "../route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CEREMONY = { id: "c1", checkInToken: "tok123" };
const GUEST = { id: "g1", name: "Alice" };
const ASSIGNMENT = { guest: GUEST };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/check-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------

describe("POST /api/check-in", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown token", async () => {
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ token: "bad", guestId: "g1" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("invalid_token");
  });

  it("returns 404 when guest not assigned to ceremony", async () => {
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY as never);
    vi.mocked(db.guestCeremony.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ token: "tok123", guestId: "g99" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_invited");
  });

  it("returns 409 when guest already checked in", async () => {
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY as never);
    vi.mocked(db.guestCeremony.findUnique).mockResolvedValue(ASSIGNMENT as never);
    vi.mocked(db.checkIn.findUnique).mockResolvedValue({
      id: "ci1",
      guestId: "g1",
      ceremonyId: "c1",
      arrivedAt: new Date("2026-09-03T10:00:00Z"),
    } as never);
    const res = await POST(makeRequest({ token: "tok123", guestId: "g1" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("already_checked_in");
    expect(body.guest.name).toBe("Alice");
  });

  it("creates check-in and returns 201 for direct guestId", async () => {
    const checkIn = { id: "ci1", guestId: "g1", ceremonyId: "c1", arrivedAt: new Date() };
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY as never);
    vi.mocked(db.guestCeremony.findUnique).mockResolvedValue(ASSIGNMENT as never);
    vi.mocked(db.checkIn.findUnique).mockResolvedValue(null);
    vi.mocked(db.checkIn.create).mockResolvedValue(checkIn as never);

    const res = await POST(makeRequest({ token: "tok123", guestId: "g1" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.guest.name).toBe("Alice");
    expect(db.checkIn.create).toHaveBeenCalledWith({
      data: { guestId: "g1", ceremonyId: "c1" },
    });
  });

  it("creates check-in from valid QR payload", async () => {
    const qr = qrPayload("g1", "c1");
    const checkIn = { id: "ci2", guestId: "g1", ceremonyId: "c1", arrivedAt: new Date() };
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY as never);
    vi.mocked(db.guestCeremony.findUnique).mockResolvedValue(ASSIGNMENT as never);
    vi.mocked(db.checkIn.findUnique).mockResolvedValue(null);
    vi.mocked(db.checkIn.create).mockResolvedValue(checkIn as never);

    const res = await POST(makeRequest({ token: "tok123", qr }));
    expect(res.status).toBe(201);
    expect(db.checkIn.create).toHaveBeenCalledWith({
      data: { guestId: "g1", ceremonyId: "c1" },
    });
  });

  it("returns 422 for invalid QR format", async () => {
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY as never);
    const res = await POST(makeRequest({ token: "tok123", qr: "not-a-valid-qr" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("invalid_qr");
  });

  it("returns 422 for QR belonging to wrong ceremony", async () => {
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY as never);
    const wrongQr = qrPayload("g1", "other-ceremony");
    const res = await POST(makeRequest({ token: "tok123", qr: wrongQr }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("wrong_ceremony");
  });
});
