import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    wedding: { findUnique: vi.fn() },
    guest: { count: vi.fn(), createMany: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { POST } from "../route";

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

function makeReq(body: unknown) {
  return new NextRequest("http://localhost:3000/api/guest/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_ROWS = [
  { name: "Alice", email: "alice@example.com", phone: "", mealPref: "" },
  { name: "Bob", email: "bob@example.com", phone: "0600000001", mealPref: "Vegan" },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/guest/import", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeReq({ weddingId: "w1", rows: VALID_ROWS }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user does not own wedding", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null);
    const res = await POST(makeReq({ weddingId: "w1", rows: VALID_ROWS }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when rows is missing", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    const res = await POST(makeReq({ weddingId: "w1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when rows is empty", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    const res = await POST(makeReq({ weddingId: "w1", rows: [] }));
    expect(res.status).toBe(400);
  });

  it("returns row errors for rows missing name", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    vi.mocked(db.guest.count).mockResolvedValue(0);
    vi.mocked(db.guest.createMany).mockResolvedValue({ count: 1 } as never);

    const rows = [
      { name: "", email: "alice@example.com", phone: "", mealPref: "" },
      { name: "Bob", email: "bob@example.com", phone: "", mealPref: "" },
    ];
    const res = await POST(makeReq({ weddingId: "w1", rows }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].row).toBe(1);
    expect(data.errors[0].message).toMatch(/name/i);
    expect(data.imported).toBe(1);
  });

  it("flags duplicate emails within the import", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    vi.mocked(db.guest.count).mockResolvedValue(0);
    vi.mocked(db.guest.createMany).mockResolvedValue({ count: 1 } as never);

    const rows = [
      { name: "Alice", email: "dup@example.com", phone: "", mealPref: "" },
      { name: "Alice2", email: "dup@example.com", phone: "", mealPref: "" },
    ];
    const res = await POST(makeReq({ weddingId: "w1", rows }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].row).toBe(2);
    expect(data.errors[0].message).toMatch(/duplicate/i);
    expect(data.imported).toBe(1);
  });

  it("flags duplicate phones within the import", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    vi.mocked(db.guest.count).mockResolvedValue(0);
    vi.mocked(db.guest.createMany).mockResolvedValue({ count: 1 } as never);

    const rows = [
      { name: "Alice", email: "", phone: "0600000000", mealPref: "" },
      { name: "Bob", email: "", phone: "0600000000", mealPref: "" },
    ];
    const res = await POST(makeReq({ weddingId: "w1", rows }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].message).toMatch(/duplicate/i);
  });

  it("returns 402 and rejects all when import would exceed guest cap", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    vi.mocked(db.guest.count).mockResolvedValue(49); // 1 slot left, importing 2

    const res = await POST(makeReq({ weddingId: "w1", rows: VALID_ROWS }));
    expect(res.status).toBe(402);
    const data = await res.json();
    expect(data.error).toBe("cap_exceeded");
    expect(data.overBy).toBe(1);
    expect(vi.mocked(db.guest.createMany)).not.toHaveBeenCalled();
  });

  it("does not enforce cap for planner weddings", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_PLANNER as never);
    vi.mocked(db.guest.createMany).mockResolvedValue({ count: 2 } as never);

    const res = await POST(makeReq({ weddingId: "w2", rows: VALID_ROWS }));
    expect(res.status).toBe(200);
    expect(vi.mocked(db.guest.createMany)).toHaveBeenCalled();
  });

  it("returns 200 with imported count on full success", async () => {
    vi.mocked(auth).mockResolvedValue(SESSION as never);
    vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING_COUPLE as never);
    vi.mocked(db.guest.count).mockResolvedValue(0);
    vi.mocked(db.guest.createMany).mockResolvedValue({ count: 2 } as never);

    const res = await POST(makeReq({ weddingId: "w1", rows: VALID_ROWS }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.imported).toBe(2);
    expect(data.errors).toHaveLength(0);
  });
});
