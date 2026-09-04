import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    wedding: { findUnique: vi.fn() },
    guestGroup: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    guestGroupMember: { upsert: vi.fn(), delete: vi.fn() },
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

const GROUP = {
  id: "grp1",
  name: "Famille Dupont",
  weddingId: "w1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PARAMS = Promise.resolve({ id: "grp1" });

function makeReq(method: string, body?: unknown) {
  return new NextRequest("http://localhost:3000/api/guest-group/grp1", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/guest-group/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/guest-group/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PATCH(makeReq("PATCH", { name: "Amis" }), { params: PARAMS });
    expect(res.status).toBe(401);
  });

  it("returns 404 when group not found", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guestGroup.findUnique).mockResolvedValue(null);
    const res = await PATCH(makeReq("PATCH", { name: "Amis" }), { params: PARAMS });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user does not own wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guestGroup.findUnique).mockResolvedValue(GROUP as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null);
    const res = await PATCH(makeReq("PATCH", { name: "Amis" }), { params: PARAMS });
    expect(res.status).toBe(403);
  });

  it("renames group and returns 200", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guestGroup.findUnique).mockResolvedValue(GROUP as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
    vi.mocked(db.guestGroup.update).mockResolvedValue({ ...GROUP, name: "Amis" } as never);

    const res = await PATCH(makeReq("PATCH", { name: "Amis" }), { params: PARAMS });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Amis");
  });

  it("adds a member when addGuestId is provided", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guestGroup.findUnique).mockResolvedValue(GROUP as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
    vi.mocked(db.guestGroupMember.upsert).mockResolvedValue({} as never);

    const res = await PATCH(makeReq("PATCH", { addGuestId: "g1" }), { params: PARAMS });
    expect(res.status).toBe(200);
    expect(vi.mocked(db.guestGroupMember.upsert)).toHaveBeenCalledOnce();
  });

  it("removes a member when removeGuestId is provided", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guestGroup.findUnique).mockResolvedValue(GROUP as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
    vi.mocked(db.guestGroupMember.delete).mockResolvedValue({} as never);

    const res = await PATCH(makeReq("PATCH", { removeGuestId: "g1" }), { params: PARAMS });
    expect(res.status).toBe(200);
    expect(vi.mocked(db.guestGroupMember.delete)).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/guest-group/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/guest-group/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(makeReq("DELETE"), { params: PARAMS });
    expect(res.status).toBe(401);
  });

  it("returns 404 when group not found", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guestGroup.findUnique).mockResolvedValue(null);
    const res = await DELETE(makeReq("DELETE"), { params: PARAMS });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user does not own wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guestGroup.findUnique).mockResolvedValue(GROUP as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null);
    const res = await DELETE(makeReq("DELETE"), { params: PARAMS });
    expect(res.status).toBe(403);
  });

  it("returns 204 on successful delete", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.guestGroup.findUnique).mockResolvedValue(GROUP as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
    vi.mocked(db.guestGroup.delete).mockResolvedValue(GROUP as never);

    const res = await DELETE(makeReq("DELETE"), { params: PARAMS });
    expect(res.status).toBe(204);
  });
});
