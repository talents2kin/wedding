import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

function makeGET() {
  return new NextRequest("http://localhost:3000/api/template", { method: "GET" });
}

describe("GET /api/template", () => {
  it("returns the template catalog", async () => {
    const res = await GET(makeGET());
    expect(res.status).toBe(200);
    const { templates } = await res.json();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    const first = templates[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("isPremium");
    expect(first).toHaveProperty("bodyText");
  });

  it("includes at least one free template", async () => {
    const res = await GET(makeGET());
    const { templates } = await res.json();
    expect(templates.some((t: { isPremium: boolean }) => !t.isPremium)).toBe(true);
  });

  it("includes at least one premium template", async () => {
    const res = await GET(makeGET());
    const { templates } = await res.json();
    expect(templates.some((t: { isPremium: boolean }) => t.isPremium)).toBe(true);
  });
});
