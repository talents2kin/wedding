import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

// Mock the Prisma db
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password_mock"),
    compare: vi.fn(),
  },
}));

import { db } from "@/lib/db";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 and the new user when input is valid", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue({
      id: "cuid_1",
      email: "alice@example.com",
      name: "Alice",
      createdAt: new Date("2026-01-01"),
    } as never);

    const res = await POST(makeRequest({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    }));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.email).toBe("alice@example.com");
    expect(data).not.toHaveProperty("passwordHash");
  });

  it("returns 409 when the email is already taken", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "cuid_existing",
      email: "alice@example.com",
    } as never);

    const res = await POST(makeRequest({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    }));

    expect(res.status).toBe(409);
  });

  it("returns 400 when the password is too short", async () => {
    const res = await POST(makeRequest({
      name: "Alice",
      email: "alice@example.com",
      password: "short",
    }));

    expect(res.status).toBe(400);
  });

  it("returns 400 when the email is malformed", async () => {
    const res = await POST(makeRequest({
      name: "Alice",
      email: "not-an-email",
      password: "password123",
    }));

    expect(res.status).toBe(400);
  });

  it("returns 400 when the request body is not JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
