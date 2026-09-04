import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/delivery", () => ({ deliver: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    wedding: { findUnique: vi.fn() },
    guest: { findMany: vi.fn() },
    ceremony: { findUnique: vi.fn() },
    invitation: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deliver } from "@/lib/delivery";
import { GET, POST } from "../route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION = { user: { id: "u1", email: "a@b.com", name: "A" } };
const WEDDING = {
  id: "w1",
  name: "Mariage Test",
  senderName: "Marie & Pierre",
  coupleAccountId: "ca1",
  plannerAccountId: null,
  coupleAccount: { userId: "u1", guestCap: 50 },
  plannerAccount: null,
  collaborators: [],
};
const GUEST = {
  id: "g1",
  name: "Alice",
  gender: "MME",
  guestType: "SINGLETON",
  email: "alice@test.com",
  phone: "+243 810000000",
};
const CEREMONY = {
  id: "c1",
  type: "CIVIL",
  customLabel: null,
  date: new Date("2026-09-10T14:00:00Z"),
  venue: "Mairie de Paris",
  weddingId: "w1",
};

function makeGET(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`http://localhost:3000/api/invitation${qs ? `?${qs}` : ""}`, { method: "GET" });
}

function makePOST(body: unknown) {
  return new NextRequest("http://localhost:3000/api/invitation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue(SESSION as never);
  vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
  vi.mocked(db.guest.findMany).mockResolvedValue([GUEST] as never);
  vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY as never);
  vi.mocked(db.invitation.findMany).mockResolvedValue([]);
  vi.mocked(deliver).mockResolvedValue({ success: true });
});

// ---------------------------------------------------------------------------
// GET tests
// ---------------------------------------------------------------------------

describe("GET /api/invitation", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeGET({ weddingId: "w1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when weddingId missing", async () => {
    const res = await GET(makeGET());
    expect(res.status).toBe(400);
  });

  it("returns 403 when wedding not owned", async () => {
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null as never);
    const res = await GET(makeGET({ weddingId: "w1" }));
    expect(res.status).toBe(403);
  });

  it("returns invitations list", async () => {
    vi.mocked(db.invitation.findMany).mockResolvedValue([
      { id: "i1", guestId: "g1", status: "SENT", channel: "EMAIL" },
    ] as never);
    const res = await GET(makeGET({ weddingId: "w1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitations).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// POST tests
// ---------------------------------------------------------------------------

describe("POST /api/invitation", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePOST({ weddingId: "w1", ceremonyId: "c1", templateId: "classique", guestIds: ["g1"], channel: "EMAIL" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makePOST({ weddingId: "w1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid channel", async () => {
    const res = await POST(makePOST({ weddingId: "w1", ceremonyId: "c1", templateId: "classique", guestIds: ["g1"], channel: "CARRIER_PIGEON" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown template", async () => {
    const res = await POST(makePOST({ weddingId: "w1", ceremonyId: "c1", templateId: "unknown", guestIds: ["g1"], channel: "EMAIL" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when wedding not owned", async () => {
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null as never);
    const res = await POST(makePOST({ weddingId: "w1", ceremonyId: "c1", templateId: "classique", guestIds: ["g1"], channel: "EMAIL" }));
    expect(res.status).toBe(403);
  });

  it("creates invitations and calls deliver for each guest", async () => {
    vi.mocked(db.invitation.create).mockResolvedValue({ id: "i1", status: "SENT" } as never);
    const res = await POST(makePOST({ weddingId: "w1", ceremonyId: "c1", templateId: "classique", guestIds: ["g1"], channel: "EMAIL" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);
    expect(vi.mocked(deliver)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.invitation.create)).toHaveBeenCalledTimes(1);
  });

  it("marks invitation as FAILED when delivery fails", async () => {
    vi.mocked(deliver).mockResolvedValue({ success: false, error: "no_recipient" });
    vi.mocked(db.invitation.create).mockResolvedValue({ id: "i1", status: "FAILED" } as never);
    const res = await POST(makePOST({ weddingId: "w1", ceremonyId: "c1", templateId: "classique", guestIds: ["g1"], channel: "EMAIL" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.failed).toBe(1);
  });

  it("accepts customBody (paid override)", async () => {
    vi.mocked(db.invitation.create).mockResolvedValue({ id: "i1", status: "SENT" } as never);
    const res = await POST(makePOST({ weddingId: "w1", ceremonyId: "c1", templateId: "classique", guestIds: ["g1"], channel: "SMS", customBody: "Bonjour {{guestName}}, venez !" }));
    expect(res.status).toBe(201);
  });
});
