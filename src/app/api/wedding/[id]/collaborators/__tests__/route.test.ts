import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/delivery", () => ({ deliver: vi.fn().mockResolvedValue({ success: true }) }));

vi.mock("@/lib/wedding-access", () => ({
  getWeddingAccess: vi.fn(),
  canManageCollaborators: (role: string) => role === "OWNER" || role === "ADMIN",
  canEdit: (role: string) => role !== "VIEWER",
  isOwner: (role: string) => role === "OWNER",
}));

vi.mock("@/lib/db", () => ({
  db: {
    weddingCollaborator: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    collaboratorInvite: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess } from "@/lib/wedding-access";
import { GET, POST } from "../route";
import { PATCH, DELETE } from "../[collaboratorId]/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTHED = { user: { id: "user_1", email: "alice@example.com", name: "Alice" } };
const WEDDING_ID = "w_1";

function makeListReq() {
  return new NextRequest(`http://localhost/api/wedding/${WEDDING_ID}/collaborators`);
}
function makeInviteReq(body: unknown) {
  return new NextRequest(`http://localhost/api/wedding/${WEDDING_ID}/collaborators`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function makePatchReq(collaboratorId: string, body: unknown) {
  return new NextRequest(`http://localhost/api/wedding/${WEDDING_ID}/collaborators/${collaboratorId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function makeDeleteReq(collaboratorId: string) {
  return new NextRequest(`http://localhost/api/wedding/${WEDDING_ID}/collaborators/${collaboratorId}`, {
    method: "DELETE",
  });
}

const OWNER_ACCESS = { role: "OWNER" as const, wedding: { id: WEDDING_ID, name: "Mariage Test", senderName: null, coupleAccountId: null, plannerAccountId: "pa_1", coupleAccount: null } };
const EDITOR_ACCESS = { ...OWNER_ACCESS, role: "EDITOR" as const };
const VIEWER_ACCESS = { ...OWNER_ACCESS, role: "VIEWER" as const };

const mockCollab = { id: "col_1", role: "EDITOR", user: { id: "user_2", name: "Bob", email: "bob@example.com" } };
const mockInvite = { id: "inv_1", email: "carol@example.com", role: "VIEWER", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(AUTHED as never);
  vi.mocked(getWeddingAccess).mockResolvedValue(OWNER_ACCESS as never);
  vi.mocked(db.weddingCollaborator.findMany).mockResolvedValue([mockCollab] as never);
  vi.mocked(db.collaboratorInvite.findMany).mockResolvedValue([mockInvite] as never);
});

// ---------------------------------------------------------------------------
// GET — list collaborators
// ---------------------------------------------------------------------------

describe("GET /api/wedding/[id]/collaborators", () => {
  it("returns collaborators and invites for any role", async () => {
    const res = await GET(makeListReq(), { params: Promise.resolve({ id: WEDDING_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.collaborators).toHaveLength(1);
    expect(body.invites).toHaveLength(1);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeListReq(), { params: Promise.resolve({ id: WEDDING_ID }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when no wedding access", async () => {
    vi.mocked(getWeddingAccess).mockResolvedValue(null);
    const res = await GET(makeListReq(), { params: Promise.resolve({ id: WEDDING_ID }) });
    expect(res.status).toBe(403);
  });

  it("viewer can list collaborators", async () => {
    vi.mocked(getWeddingAccess).mockResolvedValue(VIEWER_ACCESS as never);
    const res = await GET(makeListReq(), { params: Promise.resolve({ id: WEDDING_ID }) });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST — invite
// ---------------------------------------------------------------------------

describe("POST /api/wedding/[id]/collaborators", () => {
  beforeEach(() => {
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({ email: "alice@example.com" } as never) // current user check
      .mockResolvedValueOnce(null); // target user (no existing account)
    vi.mocked(db.collaboratorInvite.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(db.collaboratorInvite.create).mockResolvedValue({
      id: "inv_new",
      token: "tok_abc",
      email: "carol@example.com",
      role: "EDITOR",
      weddingId: WEDDING_ID,
      expiresAt: new Date(),
      createdAt: new Date(),
      acceptedAt: null,
    } as never);
  });

  it("owner can invite with valid email and role", async () => {
    const res = await POST(makeInviteReq({ email: "carol@example.com", role: "EDITOR" }), {
      params: Promise.resolve({ id: WEDDING_ID }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.invite).toBeDefined();
  });

  it("editor cannot invite (403)", async () => {
    vi.mocked(getWeddingAccess).mockResolvedValue(EDITOR_ACCESS as never);
    const res = await POST(makeInviteReq({ email: "carol@example.com", role: "EDITOR" }), {
      params: Promise.resolve({ id: WEDDING_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 422 when inviting self", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValueOnce({ email: "alice@example.com" } as never);
    const res = await POST(makeInviteReq({ email: "alice@example.com", role: "VIEWER" }), {
      params: Promise.resolve({ id: WEDDING_ID }),
    });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("cannot_invite_self");
  });

  it("returns 409 when target is already a collaborator", async () => {
    vi.mocked(db.user.findUnique)
      .mockResolvedValueOnce({ email: "alice@example.com" } as never)
      .mockResolvedValueOnce({ id: "user_2" } as never);
    vi.mocked(db.weddingCollaborator.findUnique).mockResolvedValue(mockCollab as never);
    const res = await POST(makeInviteReq({ email: "bob@example.com", role: "VIEWER" }), {
      params: Promise.resolve({ id: WEDDING_ID }),
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("already_collaborator");
  });

  it("returns 400 for invalid input", async () => {
    const res = await POST(makeInviteReq({ email: "not-an-email", role: "EDITOR" }), {
      params: Promise.resolve({ id: WEDDING_ID }),
    });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH — change role
// ---------------------------------------------------------------------------

describe("PATCH /api/wedding/[id]/collaborators/[collaboratorId]", () => {
  beforeEach(() => {
    vi.mocked(db.weddingCollaborator.findFirst).mockResolvedValue({ id: "col_1", weddingId: WEDDING_ID, userId: "user_2", role: "EDITOR" } as never);
    vi.mocked(db.weddingCollaborator.update).mockResolvedValue({ ...mockCollab, role: "VIEWER" } as never);
  });

  it("owner can change collaborator role", async () => {
    const res = await PATCH(makePatchReq("col_1", { role: "VIEWER" }), {
      params: Promise.resolve({ id: WEDDING_ID, collaboratorId: "col_1" }),
    });
    expect(res.status).toBe(200);
  });

  it("editor cannot change roles (403)", async () => {
    vi.mocked(getWeddingAccess).mockResolvedValue(EDITOR_ACCESS as never);
    const res = await PATCH(makePatchReq("col_1", { role: "VIEWER" }), {
      params: Promise.resolve({ id: WEDDING_ID, collaboratorId: "col_1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown collaborator", async () => {
    vi.mocked(db.weddingCollaborator.findFirst).mockResolvedValue(null);
    const res = await PATCH(makePatchReq("col_unknown", { role: "VIEWER" }), {
      params: Promise.resolve({ id: WEDDING_ID, collaboratorId: "col_unknown" }),
    });
    expect(res.status).toBe(404);
  });

  it("non-owner admin cannot promote to ADMIN", async () => {
    vi.mocked(getWeddingAccess).mockResolvedValue({ ...OWNER_ACCESS, role: "ADMIN" as const } as never);
    const res = await PATCH(makePatchReq("col_1", { role: "ADMIN" }), {
      params: Promise.resolve({ id: WEDDING_ID, collaboratorId: "col_1" }),
    });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// DELETE — remove collaborator
// ---------------------------------------------------------------------------

describe("DELETE /api/wedding/[id]/collaborators/[collaboratorId]", () => {
  beforeEach(() => {
    vi.mocked(db.weddingCollaborator.findFirst).mockResolvedValue({ id: "col_1", weddingId: WEDDING_ID, userId: "user_2", role: "EDITOR" } as never);
    vi.mocked(db.weddingCollaborator.delete).mockResolvedValue({} as never);
  });

  it("owner can remove a collaborator", async () => {
    const res = await DELETE(makeDeleteReq("col_1"), {
      params: Promise.resolve({ id: WEDDING_ID, collaboratorId: "col_1" }),
    });
    expect(res.status).toBe(204);
  });

  it("collaborator can remove themselves (leave)", async () => {
    vi.mocked(db.weddingCollaborator.findFirst).mockResolvedValue({
      id: "col_self", weddingId: WEDDING_ID, userId: "user_1", role: "EDITOR",
    } as never);
    vi.mocked(getWeddingAccess).mockResolvedValue(EDITOR_ACCESS as never);
    const res = await DELETE(makeDeleteReq("col_self"), {
      params: Promise.resolve({ id: WEDDING_ID, collaboratorId: "col_self" }),
    });
    expect(res.status).toBe(204);
  });

  it("non-admin cannot remove others", async () => {
    vi.mocked(getWeddingAccess).mockResolvedValue(VIEWER_ACCESS as never);
    const res = await DELETE(makeDeleteReq("col_1"), {
      params: Promise.resolve({ id: WEDDING_ID, collaboratorId: "col_1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown collaborator", async () => {
    vi.mocked(db.weddingCollaborator.findFirst).mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq("col_x"), {
      params: Promise.resolve({ id: WEDDING_ID, collaboratorId: "col_x" }),
    });
    expect(res.status).toBe(404);
  });
});
