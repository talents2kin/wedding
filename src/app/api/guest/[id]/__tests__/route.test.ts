import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    wedding: { findUnique: vi.fn() },
    guest: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    guestCeremony: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PATCH, DELETE } from "../route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION = { user: { id: "u1", email: "a@b.com", name: "A" } };

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
};

function makeReq(method: string, body?: unknown) {
  return new NextRequest("http://localhost:3000/api/guest/g1", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

const PARAMS = Promise.resolve({ id: "g1" });

// ---------------------------------------------------------------------------
// PATCH /api/guest/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/guest/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PATCH(makeReq("PATCH", { name: "Bob" }), { params: PARAMS });
    expect(res.status).toBe(401);
  });

  it("returns 404 when guest not found or forbidden", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guest.findUnique).mockResolvedValue(null);
    const res = await PATCH(makeReq("PATCH", { name: "Bob" }), { params: PARAMS });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user does not own wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guest.findUnique).mockResolvedValue(GUEST as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null);
    const res = await PATCH(makeReq("PATCH", { name: "Bob" }), { params: PARAMS });
    expect(res.status).toBe(403);
  });

  it("returns 200 with updated guest", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guest.findUnique).mockResolvedValue(GUEST as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
    vi.mocked(db.guest.update).mockResolvedValue({ ...GUEST, name: "Bob" } as never);

    const res = await PATCH(makeReq("PATCH", { name: "Bob" }), { params: PARAMS });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Bob");
  });

  it("replaces ceremony assignments when ceremonyIds provided", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guest.findUnique).mockResolvedValue(GUEST as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
    vi.mocked(db.guestCeremony.deleteMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(db.guestCeremony.createMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(db.guest.update).mockResolvedValue(GUEST as never);

    const res = await PATCH(makeReq("PATCH", { ceremonyIds: ["c2"] }), { params: PARAMS });
    expect(res.status).toBe(200);
    expect(vi.mocked(db.guestCeremony.deleteMany)).toHaveBeenCalledWith({ where: { guestId: "g1" } });
    expect(vi.mocked(db.guestCeremony.createMany)).toHaveBeenCalledWith({
      data: [{ guestId: "g1", ceremonyId: "c2" }],
    });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/guest/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/guest/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(makeReq("DELETE"), { params: PARAMS });
    expect(res.status).toBe(401);
  });

  it("returns 404 when guest not found", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guest.findUnique).mockResolvedValue(null);
    const res = await DELETE(makeReq("DELETE"), { params: PARAMS });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user does not own wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guest.findUnique).mockResolvedValue(GUEST as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null);
    const res = await DELETE(makeReq("DELETE"), { params: PARAMS });
    expect(res.status).toBe(403);
  });

  it("returns 204 on successful delete", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guest.findUnique).mockResolvedValue(GUEST as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
    vi.mocked(db.guest.delete).mockResolvedValue(GUEST as never);

    const res = await DELETE(makeReq("DELETE"), { params: PARAMS });
    expect(res.status).toBe(204);
  });
});
