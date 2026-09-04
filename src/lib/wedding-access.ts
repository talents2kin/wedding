import { db } from "@/lib/db";
import { type CollaboratorRole } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Wedding access helper
// Every page / route that gates on wedding ownership must use this helper so
// collaborators are respected alongside direct owners.
// ---------------------------------------------------------------------------

export type WeddingRole = "OWNER" | CollaboratorRole;

export type WeddingAccessResult = {
  role: WeddingRole;
  wedding: {
    id: string;
    name: string;
    senderName: string | null;
    coupleAccountId: string | null;
    plannerAccountId: string | null;
    coupleAccount: { guestCap: number } | null;
  };
} | null;

/**
 * Returns the user's role on the wedding, or null if they have no access.
 *
 * Role hierarchy (descending power):
 *   OWNER > ADMIN > EDITOR > VIEWER
 */
export async function getWeddingAccess(
  userId: string,
  weddingId: string
): Promise<WeddingAccessResult> {
  const wedding = await db.wedding.findUnique({
    where: { id: weddingId },
    select: {
      id: true,
      name: true,
      senderName: true,
      coupleAccountId: true,
      plannerAccountId: true,
      coupleAccount: { select: { userId: true, guestCap: true } },
      plannerAccount: { select: { userId: true } },
      collaborators: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!wedding) return null;

  const isOwner =
    wedding.coupleAccount?.userId === userId ||
    wedding.plannerAccount?.userId === userId;

  if (isOwner) {
    return {
      role: "OWNER",
      wedding: {
        id: wedding.id,
        name: wedding.name,
        senderName: wedding.senderName,
        coupleAccountId: wedding.coupleAccountId,
        plannerAccountId: wedding.plannerAccountId,
        coupleAccount: wedding.coupleAccount
          ? { guestCap: wedding.coupleAccount.guestCap }
          : null,
      },
    };
  }

  const collab = wedding.collaborators[0];
  if (collab) {
    return {
      role: collab.role,
      wedding: {
        id: wedding.id,
        name: wedding.name,
        senderName: wedding.senderName,
        coupleAccountId: wedding.coupleAccountId,
        plannerAccountId: wedding.plannerAccountId,
        coupleAccount: wedding.coupleAccount
          ? { guestCap: wedding.coupleAccount.guestCap }
          : null,
      },
    };
  }

  return null;
}

/** OWNER, ADMIN, or EDITOR can modify wedding content. */
export function canEdit(role: WeddingRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "EDITOR";
}

/** Only OWNER or ADMIN can invite / change / remove collaborators. */
export function canManageCollaborators(role: WeddingRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Only OWNER can delete the wedding or transfer ownership. */
export function isOwner(role: WeddingRole): boolean {
  return role === "OWNER";
}
