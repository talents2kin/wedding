import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    wedding: { findUnique: vi.fn() },
    guestGroup: { findMany: vi.fn(), create: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "../route";

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
  members: [],
};

function makeGET(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`http://localhost:3000/api/guest-group${qs ? `?${qs}` : ""}`, { method: "GET" });
}

function makePOST(body: unknown) {
  return new NextRequest("http://localhost:3000/api/guest-group", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// GET /api/guest-group
// ---------------------------------------------------------------------------

describe("GET /api/guest-group", () => {
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

  it("returns 200 with groups list", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
    vi.mocked(db.guestGroup.findMany).mockResolvedValue([GROUP] as never);

    const res = await GET(makeGET({ weddingId: "w1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.groups).toHaveLength(1);
    expect(data.groups[0].name).toBe("Famille Dupont");
  });
});

// ---------------------------------------------------------------------------
// POST /api/guest-group
// ---------------------------------------------------------------------------

describe("POST /api/guest-group", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePOST({ weddingId: "w1", name: "Amis" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user does not own wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null);
    const res = await POST(makePOST({ weddingId: "w1", name: "Amis" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
    const res = await POST(makePOST({ weddingId: "w1" }));
    expect(res.status).toBe(400);
  });

  it("returns 201 on success", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
    vi.mocked(db.guestGroup.create).mockResolvedValue(GROUP as never);

    const res = await POST(makePOST({ weddingId: "w1", name: "Famille Dupont" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("Famille Dupont");
  });
});
