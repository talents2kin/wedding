import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOwnedWedding(userId: string, weddingId: string) {
  return db.wedding.findFirst({
    where: {
      id: weddingId,
      OR: [
        { coupleAccount: { userId } },
        { plannerAccount: { userId } },
      ],
    },
    include: { coupleAccount: { select: { guestCap: true } } },
  });
}

const rowSchema = z.object({
  name: z.string(),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  mealPref: z.string().optional().default(""),
});

const bodySchema = z.object({
  weddingId: z.string().min(1),
  rows: z.array(rowSchema).min(1),
});

type ImportError = { row: number; message: string };

// ---------------------------------------------------------------------------
// POST /api/guest/import
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const result = bodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "invalid_input", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { weddingId, rows } = result.data;

  const wedding = await getOwnedWedding(session.user.id, weddingId);
  if (!wedding) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // ── Per-row validation + duplicate detection ──────────────────────────────
  const errors: ImportError[] = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const validRows: typeof rows = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (!row.name.trim()) {
      errors.push({ row: rowNum, message: `Row ${rowNum}: name is required` });
      continue;
    }

    const email = row.email?.trim().toLowerCase() || "";
    const phone = row.phone?.trim() || "";

    if (email && seenEmails.has(email)) {
      errors.push({ row: rowNum, message: `Row ${rowNum}: duplicate email (${email})` });
      continue;
    }

    if (phone && seenPhones.has(phone)) {
      errors.push({ row: rowNum, message: `Row ${rowNum}: duplicate phone (${phone})` });
      continue;
    }

    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);
    validRows.push(row);
  }

  // ── Guest cap enforcement (couple weddings only) ──────────────────────────
  if (wedding.coupleAccount) {
    const existing = await db.guest.count({ where: { weddingId } });
    const available = wedding.coupleAccount.guestCap - existing;
    if (validRows.length > available) {
      return NextResponse.json(
        { error: "cap_exceeded", overBy: validRows.length - available },
        { status: 402 }
      );
    }
  }

  // ── Bulk insert ───────────────────────────────────────────────────────────
  let imported = 0;
  if (validRows.length > 0) {
    const { count } = await db.guest.createMany({
      data: validRows.map((r) => ({
        weddingId,
        name: r.name.trim(),
        phone: r.phone?.trim() || null,
        email: r.email?.trim() || null,
        mealPref: r.mealPref?.trim() || null,
      })),
    });
    imported = count;
  }

  return NextResponse.json({ imported, errors });
}
