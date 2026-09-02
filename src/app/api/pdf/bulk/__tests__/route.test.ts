import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/pdf", () => ({
  generateInvitationPdf: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
}));
vi.mock("jszip", () => {
  class MockJSZip {
    file() {}
    async generateAsync() { return new Uint8Array([80, 75, 3, 4]); }
  }
  return { default: MockJSZip };
});
vi.mock("@/lib/db", () => ({
  db: {
    ceremony: { findUnique: vi.fn() },
    guest: { findMany: vi.fn() },
    invitation: { findMany: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET } from "../route";

const SESSION = { user: { id: "u1", email: "a@b.com", name: "A" } };

const CEREMONY = {
  id: "c1", type: "CIVIL", customLabel: null,
  date: new Date("2026-09-10"), venue: "Mairie",
  wedding: {
    id: "w1", name: "Mariage Test", senderName: "Marie & Pierre",
    coupleAccount: { userId: "u1" }, plannerAccount: null,
  },
  guestAssignments: [{ guestId: "g1" }],
};

const GUEST = {
  id: "g1", name: "Alice", guestType: "SINGLETON", gender: "MME",
};

function makeGET(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`http://localhost:3000/api/pdf/bulk?${qs}`);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(auth).mockResolvedValue(SESSION as never);
  vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY as never);
  vi.mocked(db.guest.findMany).mockResolvedValue([GUEST] as never);
  vi.mocked(db.invitation.findMany).mockResolvedValue([]);
});

describe("GET /api/pdf/bulk", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET(makeGET({ ceremonyId: "c1", templateId: "classique" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when params missing", async () => {
    const res = await GET(makeGET({ ceremonyId: "c1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown template", async () => {
    const res = await GET(makeGET({ ceremonyId: "c1", templateId: "unknown" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when ceremony not found or not owned", async () => {
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(null as never);
    const res = await GET(makeGET({ ceremonyId: "c1", templateId: "classique" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when user does not own the wedding", async () => {
    vi.mocked(db.ceremony.findUnique).mockResolvedValue({
      ...CEREMONY,
      wedding: { ...CEREMONY.wedding, coupleAccount: { userId: "other" }, plannerAccount: null },
    } as never);
    const res = await GET(makeGET({ ceremonyId: "c1", templateId: "classique" }));
    expect(res.status).toBe(403);
  });

  it("returns ZIP binary with correct content-type on success", async () => {
    const res = await GET(makeGET({ ceremonyId: "c1", templateId: "classique" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toMatch(/filename=.*\.zip/);
  });
});
