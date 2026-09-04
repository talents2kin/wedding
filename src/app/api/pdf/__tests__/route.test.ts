import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/pdf", () => ({
  generateInvitationPdf: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])), // %PDF
  qrPayload: vi.fn().mockReturnValue("g:g1|c:c1"),
}));
vi.mock("@/lib/db", () => ({
  db: {
    wedding: { findUnique: vi.fn() },
    guest: { findUnique: vi.fn() },
    ceremony: { findUnique: vi.fn() },
    invitation: { findFirst: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateInvitationPdf } from "@/lib/pdf";
import { GET } from "../route";

const SESSION = { user: { id: "u1", email: "a@b.com", name: "A" } };

const GUEST = {
  id: "g1", name: "Alice", guestType: "SINGLETON", gender: "MME",
  email: "alice@test.com", phone: null,
  weddingId: "w1",
};

const CEREMONY = {
  id: "c1", type: "CIVIL", customLabel: null,
  date: new Date("2026-09-10"), venue: "Mairie",
};

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

function makeGET(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`http://localhost:3000/api/pdf?${qs}`);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue(SESSION as never);
  vi.mocked(db.guest.findUnique).mockResolvedValue(GUEST as never);
  vi.mocked(db.wedding.findUnique).mockResolvedValue(WEDDING as never);
  vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY as never);
  vi.mocked(db.invitation.findFirst).mockResolvedValue(null as never);
  vi.mocked(generateInvitationPdf).mockResolvedValue(new Uint8Array([37, 80, 68, 70]) as never);
});

describe("GET /api/pdf", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeGET({ guestId: "g1", ceremonyId: "c1", templateId: "classique" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when params missing", async () => {
    const res = await GET(makeGET({ guestId: "g1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown template", async () => {
    const res = await GET(makeGET({ guestId: "g1", ceremonyId: "c1", templateId: "ghost" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when guest not found", async () => {
    vi.mocked(db.guest.findUnique).mockResolvedValue(null as never);
    const res = await GET(makeGET({ guestId: "g1", ceremonyId: "c1", templateId: "classique" }));
    expect(res.status).toBe(404);
  });

  it("returns 403 when user does not own the wedding", async () => {
    vi.mocked(db.wedding.findUnique).mockResolvedValue(null);
    const res = await GET(makeGET({ guestId: "g1", ceremonyId: "c1", templateId: "classique" }));
    expect(res.status).toBe(403);
  });

  it("returns PDF binary with correct content-type on success", async () => {
    const res = await GET(makeGET({ guestId: "g1", ceremonyId: "c1", templateId: "classique" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toMatch(/filename=.*\.pdf/);
  });
});
