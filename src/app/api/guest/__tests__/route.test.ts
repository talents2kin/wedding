import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    wedding: { findUnique: vi.fn() },
    guest: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    guestCeremony: { createMany: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "../route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION = { user: { id: "u1", email: "a@b.com", name: "A" } };

const WEDDING_COUPLE = {
  id: "w1",
  name: "Test Wedding",
  senderName: null,
  coupleAccountId: "ca1",
  plannerAccountId: null,
  coupleAccount: { userId: "u1", guestCap: 50 },
  plannerAccount: null,
  collaborators: [],
};

const WEDDING_PLANNER = {
  id: "w2",
  name: "Test Wedding",
  senderName: null,
  coupleAccountId: null,
  plannerAccountId: "pa1",
  coupleAccount: null,
  plannerAccount: { userId: "u1" },
  collaborators: [],
};

const GUEST = {
  id: "g1",
  name: "Alice",
  phone: null,
  email: "alice@example.com",
  mealPref: null,
  plusOneName: null,
  plusOnePhone: null,
  plusOneEmail: null,
  weddingId: "w1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ceremonyAssignments: [],
  groupMemberships: [],
};

function makeGET(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`http://localhost:3000/api/guest${qs ? `?${qs}` : ""}`, { method: "GET" });
}

function makePOST(body: unknown) {
  return new NextRequest("http://localhost:3000/api/guest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// GET /api/guest
// ---------------------------------------------------------------------------

describe("GET /api/guest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeGET({ weddingId: "w1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when weddingId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const res = await GET(makeGET());
    expect(res.status).toBe(400);
  });

  it("returns 403 when user does not own wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null);
    const res = await GET(makeGET({ weddingId: "w1" }));
    expect(res.status).toBe(403);
  });

  it("returns 200 with guests list", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    vi.mocked(db.guest.findMany).mockResolvedValue([GUEST] as never);

    const res = await GET(makeGET({ weddingId: "w1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.guests).toHaveLength(1);
    expect(data.guests[0].name).toBe("Alice");
  });

  it("passes filter params to query", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    vi.mocked(db.guest.findMany).mockResolvedValue([]);

    await GET(makeGET({ weddingId: "w1", groupId: "grp1", ceremonyId: "c1", rsvp: "CONFIRMED" }));

    const call = vi.mocked(db.guest.findMany).mock.calls[0][0];
    expect(JSON.stringify(call?.where)).toContain("grp1");
    expect(JSON.stringify(call?.where)).toContain("c1");
    expect(JSON.stringify(call?.where)).toContain("CONFIRMED");
  });
});

// ---------------------------------------------------------------------------
// POST /api/guest
// ---------------------------------------------------------------------------

describe("POST /api/guest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePOST({ weddingId: "w1", name: "Bob" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user does not own wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null);
    const res = await POST(makePOST({ weddingId: "w1", name: "Bob" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    const res = await POST(makePOST({ weddingId: "w1" }));
    expect(res.status).toBe(400);
  });

  it("returns 402 when couple guest cap is reached", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    vi.mocked(db.guest.count).mockResolvedValue(50); // at cap of 50

    const res = await POST(makePOST({ weddingId: "w1", name: "Bob" }));
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.error).toBe("cap_exceeded");
  });

  it("does not enforce cap for planner weddings", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_PLANNER as never);
    vi.mocked(db.guest.count).mockResolvedValue(999);
    vi.mocked(db.guest.create).mockResolvedValue({ ...GUEST, weddingId: "w2" } as never);

    const res = await POST(makePOST({ weddingId: "w2", name: "Bob" }));
    expect(res.status).toBe(201);
  });

  it("returns 201 on success for couple wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    vi.mocked(db.guest.count).mockResolvedValue(10);
    vi.mocked(db.guest.create).mockResolvedValue(GUEST as never);

    const res = await POST(makePOST({ weddingId: "w1", name: "Alice", email: "alice@example.com" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("Alice");
  });

  it("creates ceremony assignments when ceremonyIds provided", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    vi.mocked(db.guest.count).mockResolvedValue(10);
    vi.mocked(db.guest.create).mockResolvedValue(GUEST as never);
    vi.mocked(db.guestCeremony.createMany).mockResolvedValue({ count: 2 } as never);

    const res = await POST(makePOST({ weddingId: "w1", name: "Alice", ceremonyIds: ["c1", "c2"] }));
    expect(res.status).toBe(201);
    expect(vi.mocked(db.guestCeremony.createMany)).toHaveBeenCalledWith({
      data: [
        { guestId: "g1", ceremonyId: "c1" },
        { guestId: "g1", ceremonyId: "c2" },
      ],
    });
  });
});
