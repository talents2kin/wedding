import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    coupleAccount: {
      findUnique: vi.fn(),
    },
    wedding: {
      create: vi.fn(),
    },
    guestCeremony: {
      count: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "../route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AUTHED_SESSION = { user: { id: "user_1", email: "alice@example.com", name: "Alice" } };

const COUPLE_ACCOUNT_NO_WEDDING = {
  id: "ca_1",
  userId: "user_1",
  guestCap: 50,
  templateLimit: 1,
  wedding: null,
};

const WEDDING = {
  id: "w_1",
  name: "Huguette & Déo",
  date: new Date("2026-06-14T00:00:00.000Z"),
  coupleAccountId: "ca_1",
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { ceremonies: 0, guests: 0 },
};

const COUPLE_ACCOUNT_WITH_WEDDING = {
  ...COUPLE_ACCOUNT_NO_WEDDING,
  wedding: WEDDING,
};

function makeRequest(body?: unknown) {
  return new NextRequest("http://localhost:3000/api/wedding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// GET /api/wedding
// ---------------------------------------------------------------------------

describe("GET /api/wedding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when user has no couple account", async () => {
    vi.mocked(auth).mockResolvedValue(AUTHED_SESSION as never);
    vi.mocked(db.coupleAccount.findUnique).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns 404 when couple account has no wedding", async () => {
    vi.mocked(auth).mockResolvedValue(AUTHED_SESSION as never);
    vi.mocked(db.coupleAccount.findUnique).mockResolvedValue(
      COUPLE_ACCOUNT_NO_WEDDING as never
    );
    const res = await GET();
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("no_wedding");
  });

  it("returns 200 with wedding + counts when found", async () => {
    vi.mocked(auth).mockResolvedValue(AUTHED_SESSION as never);
    vi.mocked(db.coupleAccount.findUnique).mockResolvedValue(
      COUPLE_ACCOUNT_WITH_WEDDING as never
    );
    vi.mocked(db.guestCeremony.count).mockResolvedValue(0);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Huguette & Déo");
    expect(data.ceremonies).toBe(0);
    expect(data.guests).toBe(0);
    expect(data.rsvpConfirmed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// POST /api/wedding
// ---------------------------------------------------------------------------

describe("POST /api/wedding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeRequest({ name: "Test", date: "2026-06-14" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no couple account", async () => {
    vi.mocked(auth).mockResolvedValue(AUTHED_SESSION as never);
    vi.mocked(db.coupleAccount.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ name: "Test", date: "2026-06-14" }));
    expect(res.status).toBe(403);
  });

  it("returns 409 when couple already has a wedding", async () => {
    vi.mocked(auth).mockResolvedValue(AUTHED_SESSION as never);
    vi.mocked(db.coupleAccount.findUnique).mockResolvedValue(
      COUPLE_ACCOUNT_WITH_WEDDING as never
    );
    const res = await POST(makeRequest({ name: "Test", date: "2026-06-14" }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("wedding_exists");
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(auth).mockResolvedValue(AUTHED_SESSION as never);
    const res = await POST(makeRequest({ date: "2026-06-14" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when date is missing", async () => {
    vi.mocked(auth).mockResolvedValue(AUTHED_SESSION as never);
    const res = await POST(makeRequest({ name: "Test" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when date is not a valid ISO date", async () => {
    vi.mocked(auth).mockResolvedValue(AUTHED_SESSION as never);
    const res = await POST(makeRequest({ name: "Test", date: "not-a-date" }));
    expect(res.status).toBe(400);
  });

  it("returns 201 with created wedding on success", async () => {
    vi.mocked(auth).mockResolvedValue(AUTHED_SESSION as never);
    vi.mocked(db.coupleAccount.findUnique).mockResolvedValue(
      COUPLE_ACCOUNT_NO_WEDDING as never
    );
    vi.mocked(db.wedding.create).mockResolvedValue(WEDDING as never);

    const res = await POST(makeRequest({ name: "Huguette & Déo", date: "2026-06-14" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("Huguette & Déo");
  });

  it("returns 400 when body is not valid JSON", async () => {
    vi.mocked(auth).mockResolvedValue(AUTHED_SESSION as never);
    const req = new NextRequest("http://localhost:3000/api/wedding", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
