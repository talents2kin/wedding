import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    plannerAccount: { findUnique: vi.fn() },
    wedding: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "../route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION = { user: { id: "user_1", email: "planner@example.com", name: "Bob" } };

const PLANNER_ACCOUNT = {
  id: "pa_1",
  userId: "user_1",
  weddingLimit: 1,
};

const WEDDING = {
  id: "w_1",
  name: "Alice & Bob",
  date: new Date("2026-10-15T00:00:00.000Z"),
  plannerAccountId: "pa_1",
  coupleAccountId: null,
  _count: { guests: 5 },
  ceremonies: [],
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/planner/wedding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// POST /api/planner/wedding
// ---------------------------------------------------------------------------

describe("POST /api/planner/wedding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeRequest({ name: "Test", date: "2026-10-15" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no planner account", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.plannerAccount.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ name: "Test", date: "2026-10-15" }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("no_planner_account");
  });

  it("returns 403 with upgrade_required when at wedding limit", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.plannerAccount.findUnique).mockResolvedValue(PLANNER_ACCOUNT as never);
    vi.mocked(db.wedding.count).mockResolvedValue(1);

    const res = await POST(makeRequest({ name: "Test", date: "2026-10-15" }));
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.error).toBe("upgrade_required");
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.plannerAccount.findUnique).mockResolvedValue(PLANNER_ACCOUNT as never);
    vi.mocked(db.wedding.count).mockResolvedValue(0);
    const res = await POST(makeRequest({ date: "2026-10-15" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when date is missing", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.plannerAccount.findUnique).mockResolvedValue(PLANNER_ACCOUNT as never);
    vi.mocked(db.wedding.count).mockResolvedValue(0);
    const res = await POST(makeRequest({ name: "Test" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when date is invalid", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.plannerAccount.findUnique).mockResolvedValue(PLANNER_ACCOUNT as never);
    vi.mocked(db.wedding.count).mockResolvedValue(0);
    const res = await POST(makeRequest({ name: "Test", date: "not-a-date" }));
    expect(res.status).toBe(400);
  });

  it("returns 201 with created wedding on success", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.plannerAccount.findUnique).mockResolvedValue(PLANNER_ACCOUNT as never);
    vi.mocked(db.wedding.count).mockResolvedValue(0);
    vi.mocked(db.wedding.create).mockResolvedValue(WEDDING as never);

    const res = await POST(makeRequest({ name: "Alice & Bob", date: "2026-10-15" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("Alice & Bob");
  });

  it("returns 400 when body is not valid JSON", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    const req = new NextRequest("http://localhost:3000/api/planner/wedding", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/planner/wedding
// ---------------------------------------------------------------------------

describe("GET /api/planner/wedding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no planner account", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.plannerAccount.findUnique).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 200 with list of weddings", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.plannerAccount.findUnique).mockResolvedValue(PLANNER_ACCOUNT as never);
    vi.mocked(db.wedding.findMany).mockResolvedValue([WEDDING] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.weddings).toHaveLength(1);
    expect(data.weddings[0].name).toBe("Alice & Bob");
    expect(data.weddings[0]).toHaveProperty("status");
    expect(data.weddings[0]).toHaveProperty("guestCount");
  });

  it("returns empty list when planner has no weddings", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.plannerAccount.findUnique).mockResolvedValue(PLANNER_ACCOUNT as never);
    vi.mocked(db.wedding.findMany).mockResolvedValue([] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.weddings).toHaveLength(0);
  });
});
