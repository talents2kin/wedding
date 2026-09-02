import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    wedding: { findFirst: vi.fn() },
    ceremony: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
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
  coupleAccountId: "ca1",
  plannerAccountId: null,
  coupleAccount: { userId: "u1" },
  plannerAccount: null,
};

const CEREMONY = {
  id: "c1",
  type: "CIVIL",
  customLabel: null,
  date: new Date("2026-10-15T14:00:00.000Z"),
  venue: "Mairie de Paris",
  position: 0,
  weddingId: "w1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeGET(weddingId?: string) {
  return new NextRequest(
    `http://localhost:3000/api/ceremony${weddingId ? `?weddingId=${weddingId}` : ""}`,
    { method: "GET" }
  );
}

function makePOST(body: unknown) {
  return new NextRequest("http://localhost:3000/api/ceremony", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// GET /api/ceremony
// ---------------------------------------------------------------------------

describe("GET /api/ceremony", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeGET("w1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when weddingId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const res = await GET(makeGET());
    expect(res.status).toBe(400);
  });

  it("returns 403 when user does not own the wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findFirst).mockResolvedValue(null);
    const res = await GET(makeGET("w1"));
    expect(res.status).toBe(403);
  });

  it("returns 200 with ceremonies ordered by position", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findFirst).mockResolvedValue(WEDDING as never);
    vi.mocked(db.ceremony.findMany).mockResolvedValue([CEREMONY] as never);

    const res = await GET(makeGET("w1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ceremonies).toHaveLength(1);
    expect(data.ceremonies[0].type).toBe("CIVIL");
    expect(data.ceremonies[0].venue).toBe("Mairie de Paris");
  });
});

// ---------------------------------------------------------------------------
// POST /api/ceremony
// ---------------------------------------------------------------------------

describe("POST /api/ceremony", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePOST({ weddingId: "w1", type: "CIVIL" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user does not own the wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findFirst).mockResolvedValue(null);
    const res = await POST(makePOST({ weddingId: "w1", type: "CIVIL" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when weddingId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const res = await POST(makePOST({ type: "CIVIL" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is invalid", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findFirst).mockResolvedValue(WEDDING as never);
    const res = await POST(makePOST({ weddingId: "w1", type: "INVALID" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is CUSTOM but customLabel is missing", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findFirst).mockResolvedValue(WEDDING as never);
    vi.mocked(db.ceremony.count).mockResolvedValue(0);
    const res = await POST(makePOST({ weddingId: "w1", type: "CUSTOM" }));
    expect(res.status).toBe(400);
  });

  it("returns 201 on success with CIVIL type", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findFirst).mockResolvedValue(WEDDING as never);
    vi.mocked(db.ceremony.count).mockResolvedValue(0);
    vi.mocked(db.ceremony.create).mockResolvedValue(CEREMONY as never);

    const res = await POST(makePOST({ weddingId: "w1", type: "CIVIL", venue: "Mairie de Paris", date: "2026-10-15", time: "14:00" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.type).toBe("CIVIL");
  });

  it("returns 201 on success with CUSTOM type + label", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findFirst).mockResolvedValue(WEDDING as never);
    vi.mocked(db.ceremony.count).mockResolvedValue(1);
    vi.mocked(db.ceremony.create).mockResolvedValue({
      ...CEREMONY,
      type: "CUSTOM",
      customLabel: "Brunch",
      position: 1,
    } as never);

    const res = await POST(makePOST({ weddingId: "w1", type: "CUSTOM", customLabel: "Brunch" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.customLabel).toBe("Brunch");
  });
});
