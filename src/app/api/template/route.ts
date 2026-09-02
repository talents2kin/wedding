import { NextRequest, NextResponse } from "next/server";
import { TEMPLATES } from "@/lib/templates";

// ---------------------------------------------------------------------------
// GET /api/template — return the static platform template catalog
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest) {
  return NextResponse.json({ templates: TEMPLATES });
}
