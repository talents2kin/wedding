import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    ceremony: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PATCH, DELETE } from "../route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION = { user: { id: "u1", email: "a@b.com", name: "A" } };

const CEREMONY_WITH_WEDDING = {
  id: "c1",
  type: "CIVIL",
  customLabel: null,
  date: new Date("2026-10-15T14:00:00.000Z"),
  venue: "Mairie de Paris",
  position: 0,
  weddingId: "w1",
  wedding: {
    coupleAccount: { userId: "u1" },
    plannerAccount: null,
  },
  _count: { guestAssignments: 0 },
};

const CEREMONY_WITH_GUESTS = {
  ...CEREMONY_WITH_WEDDING,
  _count: { guestAssignments: 3 },
};

const CEREMONY_WRONG_OWNER = {
  ...CEREMONY_WITH_WEDDING,
  wedding: {
    coupleAccount: { userId: "other_user" },
    plannerAccount: null,
  },
};

function makePATCH(id: string, body: unknown) {
  return new NextRequest(`http://localhost:3000/api/ceremony/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDELETE(id: string, force = false) {
  return new NextRequest(
    `http://localhost:3000/api/ceremony/${id}${force ? "?force=true" : ""}`,
    { method: "DELETE" }
  );
}

// ---------------------------------------------------------------------------
// PATCH /api/ceremony/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/ceremony/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await PATCH(makePATCH("c1", { venue: "New Venue" }), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when ceremony not found", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(null);
    const res = await PATCH(makePATCH("c1", { venue: "New Venue" }), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user does not own the wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY_WRONG_OWNER as never);
    const res = await PATCH(makePATCH("c1", { venue: "New" }), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 200 on success", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY_WITH_WEDDING as never);
    vi.mocked(db.ceremony.update).mockResolvedValue({ ...CEREMONY_WITH_WEDDING, venue: "New Venue" } as never);

    const res = await PATCH(makePATCH("c1", { venue: "New Venue" }), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.venue).toBe("New Venue");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/ceremony/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/ceremony/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await DELETE(makeDELETE("c1"), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when ceremony not found", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(null);
    const res = await DELETE(makeDELETE("c1"), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user does not own the wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY_WRONG_OWNER as never);
    const res = await DELETE(makeDELETE("c1"), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 409 when guests assigned and no force flag", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY_WITH_GUESTS as never);

    const res = await DELETE(makeDELETE("c1", false), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("guests_assigned");
    expect(data.count).toBe(3);
  });

  it("deletes successfully when no guests assigned", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY_WITH_WEDDING as never);
    vi.mocked(db.ceremony.delete).mockResolvedValue(CEREMONY_WITH_WEDDING as never);

    const res = await DELETE(makeDELETE("c1"), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(204);
  });

  it("deletes with force=true even when guests assigned", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY_WITH_GUESTS as never);
    vi.mocked(db.ceremony.delete).mockResolvedValue(CEREMONY_WITH_GUESTS as never);

    const res = await DELETE(makeDELETE("c1", true), { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(204);
  });
});
