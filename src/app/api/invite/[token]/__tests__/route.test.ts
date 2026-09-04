import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    collaboratorInvite: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    weddingCollaborator: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET, POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOKEN = "tok_abc123";
const AUTHED = { user: { id: "user_1", email: "carol@example.com", name: "Carol" } };

function makeGetReq() {
  return new NextRequest(`http://localhost/api/invite/${TOKEN}`);
}
function makePostReq() {
  return new NextRequest(`http://localhost/api/invite/${TOKEN}`, { method: "POST" });
}

const futureDate = new Date(Date.now() + 86400000); // +1 day
const pastDate = new Date(Date.now() - 86400000);   // -1 day

const VALID_INVITE = {
  id: "inv_1",
  token: TOKEN,
  email: "carol@example.com",
  role: "EDITOR" as const,
  weddingId: "w_1",
  acceptedAt: null,
  expiresAt: futureDate,
  createdAt: new Date(),
  wedding: { id: "w_1", name: "Mariage Carol", date: new Date("2026-06-15") },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(AUTHED as never);
});

// ---------------------------------------------------------------------------
// GET — load invite info
// ---------------------------------------------------------------------------

describe("GET /api/invite/[token]", () => {
  it("returns invite info for a valid token", async () => {
    vi.mocked(db.collaboratorInvite.findUnique).mockResolvedValue(VALID_INVITE as never);
    const res = await GET(makeGetReq(), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.weddingName).toBe("Mariage Carol");
    expect(body.email).toBe("carol@example.com");
    expect(body.role).toBe("EDITOR");
  });

  it("returns 404 for unknown token", async () => {
    vi.mocked(db.collaboratorInvite.findUnique).mockResolvedValue(null);
    const res = await GET(makeGetReq(), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("not_found");
  });

  it("returns 410 for already accepted invite", async () => {
    vi.mocked(db.collaboratorInvite.findUnique).mockResolvedValue({
      ...VALID_INVITE,
      acceptedAt: new Date(),
    } as never);
    const res = await GET(makeGetReq(), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(410);
    expect((await res.json()).error).toBe("already_accepted");
  });

  it("returns 410 for expired invite", async () => {
    vi.mocked(db.collaboratorInvite.findUnique).mockResolvedValue({
      ...VALID_INVITE,
      acceptedAt: null,
      expiresAt: pastDate,
    } as never);
    const res = await GET(makeGetReq(), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(410);
    expect((await res.json()).error).toBe("expired");
  });
});

// ---------------------------------------------------------------------------
// POST — accept invite
// ---------------------------------------------------------------------------

describe("POST /api/invite/[token]", () => {
  beforeEach(() => {
    vi.mocked(db.collaboratorInvite.findUnique).mockResolvedValue(VALID_INVITE as never);
    vi.mocked(db.user.findUnique).mockResolvedValue({ email: "carol@example.com" } as never);
    vi.mocked(db.weddingCollaborator.findUnique).mockResolvedValue(null);
    vi.mocked(db.$transaction).mockResolvedValue([
      { id: "col_new", weddingId: "w_1", userId: "user_1", role: "EDITOR" },
      { ...VALID_INVITE, acceptedAt: new Date() },
    ] as never);
  });

  it("accepts a valid invite and creates a collaborator", async () => {
    const res = await POST(makePostReq(), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.weddingId).toBe("w_1");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makePostReq(), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("returns 404 for unknown token", async () => {
    vi.mocked(db.collaboratorInvite.findUnique).mockResolvedValue(null);
    const res = await POST(makePostReq(), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(404);
  });

  it("returns 410 for already accepted invite", async () => {
    vi.mocked(db.collaboratorInvite.findUnique).mockResolvedValue({
      ...VALID_INVITE,
      acceptedAt: new Date(),
    } as never);
    const res = await POST(makePostReq(), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(410);
  });

  it("returns 410 for expired invite", async () => {
    vi.mocked(db.collaboratorInvite.findUnique).mockResolvedValue({
      ...VALID_INVITE,
      expiresAt: pastDate,
    } as never);
    const res = await POST(makePostReq(), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(410);
  });

  it("returns 403 when logged-in user email does not match invite email", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ email: "other@example.com" } as never);
    const res = await POST(makePostReq(), { params: Promise.resolve({ token: TOKEN }) });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("email_mismatch");
  });
});
