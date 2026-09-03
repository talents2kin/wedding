import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    ceremony: { findUnique: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { GET } from "../route";

function makeRequest(token: string) {
  return new NextRequest(`http://localhost:3000/api/check-in/${token}`);
}

const CEREMONY = {
  id: "c1",
  type: "CIVIL",
  customLabel: null,
  checkInToken: "tok123",
  guestAssignments: [
    { guest: { id: "g1", name: "Alice" } },
    { guest: { id: "g2", name: "Bob" } },
  ],
  checkIns: [
    { guestId: "g1", arrivedAt: new Date("2026-09-03T10:05:00Z"), guest: { id: "g1", name: "Alice" } },
  ],
};

describe("GET /api/check-in/[token]", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 404 for unknown token", async () => {
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(null);
    const res = await GET(makeRequest("bad"), { params: Promise.resolve({ token: "bad" }) });
    expect(res.status).toBe(404);
  });

  it("returns stats and lists for a valid token", async () => {
    vi.mocked(db.ceremony.findUnique).mockResolvedValue(CEREMONY as never);

    const res = await GET(makeRequest("tok123"), { params: Promise.resolve({ token: "tok123" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ceremonyLabel).toBe("Civil");
    expect(body.totalExpected).toBe(2);
    expect(body.arrivedCount).toBe(1);
    expect(body.guests).toHaveLength(2);
    expect(body.checkIns).toHaveLength(1);
    expect(body.checkIns[0].guestName).toBe("Alice");
  });

  it("uses customLabel when set", async () => {
    vi.mocked(db.ceremony.findUnique).mockResolvedValue({
      ...CEREMONY,
      type: "CUSTOM",
      customLabel: "Brunch",
    } as never);

    const res = await GET(makeRequest("tok123"), { params: Promise.resolve({ token: "tok123" }) });
    const body = await res.json();
    expect(body.ceremonyLabel).toBe("Brunch");
  });
});
