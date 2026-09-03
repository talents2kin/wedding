import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CheckInScanner } from "@/components/app/check-in-scanner";

const CEREMONY_LABELS: Record<string, string> = {
  COUTUMIER: "Coutumier",
  CIVIL: "Civil",
  RELIGIEUX: "Religieux",
  CUSTOM: "Personnalisé",
};

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const ceremony = await db.ceremony.findUnique({
    where: { checkInToken: token },
    include: {
      guestAssignments: {
        include: { guest: { select: { id: true, name: true } } },
      },
      checkIns: {
        include: { guest: { select: { id: true, name: true } } },
        orderBy: { arrivedAt: "desc" },
      },
    },
  });

  if (!ceremony) notFound();

  const ceremonyLabel = ceremony.customLabel ?? CEREMONY_LABELS[ceremony.type] ?? ceremony.type;

  const initialStats = {
    ceremonyLabel,
    totalExpected: ceremony.guestAssignments.length,
    arrivedCount: ceremony.checkIns.length,
    guests: ceremony.guestAssignments.map((a) => ({
      id: a.guest.id,
      name: a.guest.name,
    })),
    checkIns: ceremony.checkIns.map((c) => ({
      guestId: c.guestId,
      guestName: c.guest.name,
      arrivedAt: c.arrivedAt.toISOString(),
    })),
  };

  return <CheckInScanner token={token} initialStats={initialStats} />;
}
