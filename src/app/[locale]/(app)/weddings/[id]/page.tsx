import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeddingAccess, canManageCollaborators } from "@/lib/wedding-access";
import { CalendarDays, Users, CheckCircle2, ArrowLeft, ScanLine, UserCheck } from "lucide-react";
import Link from "next/link";
import { SenderNameEditor } from "@/components/app/sender-name-editor";
import { CollaboratorManager } from "@/components/app/collaborator-manager";

function fmt(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

function ceremonyLabel(type: string, customLabel: string | null): string {
  if (type === "CUSTOM") return customLabel ?? "Personnalisé";
  return { COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux" }[type] ?? type;
}

export default async function WeddingDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const { id: weddingId } = await params;

  const access = await getWeddingAccess(session.user.id, weddingId);
  if (!access) notFound();

  const userRole = access.role;
  const canInviteCollaborators = canManageCollaborators(userRole);

  const wedding = await db.wedding.findUnique({
    where: { id: weddingId },
    include: {
      _count: { select: { guests: true } },
      ceremonies: {
        orderBy: { position: "asc" },
        include: {
          _count: { select: { guestAssignments: true, checkIns: true } },
          guestAssignments: { select: { rsvp: true } },
          checkIns: {
            include: { guest: { select: { name: true } } },
            orderBy: { arrivedAt: "asc" },
          },
        },
      },
    },
  });

  if (!wedding) notFound();

  const totalGuests = wedding._count.guests;
  const totalConfirmed = wedding.ceremonies.flatMap((c) => c.guestAssignments).filter((a) => a.rsvp === "CONFIRMED").length;
  const totalCeremonies = wedding.ceremonies.length;

  const ceremonyRows = wedding.ceremonies.map((c) => ({
    id: c.id,
    label: ceremonyLabel(c.type, c.customLabel),
    total: c._count.guestAssignments,
    confirmed: c.guestAssignments.filter((a) => a.rsvp === "CONFIRMED").length,
    declined: c.guestAssignments.filter((a) => a.rsvp === "DECLINED").length,
    pending: c.guestAssignments.filter((a) => a.rsvp === "PENDING").length,
    arrived: c._count.checkIns,
    checkInToken: c.checkInToken,
    checkIns: c.checkIns.map((ci) => ({
      guestName: ci.guest.name,
      arrivedAt: ci.arrivedAt,
    })),
  }));

  return (
    <div className="flex flex-col">
      <header className="border-b border-border px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/weddings"
              className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Mes mariages
            </Link>
            <h1 className="text-2xl font-bold leading-tight">{wedding.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{fmt(wedding.date)}</p>
            <div className="mt-2">
              <SenderNameEditor weddingId={weddingId} initialValue={wedding.senderName} />
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/weddings/${weddingId}/ceremonies`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:bg-muted"
            >
              Cérémonies
            </Link>
            <Link
              href={`/weddings/${weddingId}/guests`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm text-muted-foreground hover:bg-muted"
            >
              Invités
            </Link>
            <Link
              href={`/weddings/${weddingId}/invitations`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Invitations
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-8 py-8">
        {/* Stats */}
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Invités</p>
              </div>
              <p className="text-3xl font-bold tabular-nums">{totalGuests}</p>
            </div>
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Confirmés</p>
              </div>
              <p className="text-3xl font-bold tabular-nums">{totalConfirmed}</p>
            </div>
            <div className="px-6 py-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CalendarDays className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Cérémonies</p>
              </div>
              <p className="text-3xl font-bold tabular-nums">{totalCeremonies}</p>
            </div>
          </div>
        </div>

        {/* Per-ceremony RSVP breakdown */}
        {ceremonyRows.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-sm font-semibold">RSVP par cérémonie</h2>
            <div className="overflow-hidden rounded-xl border border-border bg-background">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-3 text-left">Cérémonie</th>
                    <th className="px-4 py-3 text-center">Invités</th>
                    <th className="px-4 py-3 text-center text-emerald-700">Confirmés</th>
                    <th className="px-4 py-3 text-center text-destructive">Déclinés</th>
                    <th className="px-4 py-3 text-center">En attente</th>
                    <th className="px-4 py-3 text-center text-primary">Arrivés</th>
                    <th className="px-4 py-3 text-center">Check-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ceremonyRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-6 py-3 font-medium">{row.label}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{row.total}</td>
                      <td className="px-4 py-3 text-center tabular-nums font-medium text-emerald-700">{row.confirmed}</td>
                      <td className="px-4 py-3 text-center tabular-nums font-medium text-destructive">{row.declined}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{row.pending}</td>
                      <td className="px-4 py-3 text-center tabular-nums font-medium text-primary">{row.arrived}</td>
                      <td className="px-4 py-3 text-center">
                        {row.checkInToken ? (
                          <Link
                            href={`/check-in/${row.checkInToken}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ScanLine className="h-3 w-3" />
                            Ouvrir
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Per-ceremony check-in log */}
        {ceremonyRows.some((r) => r.checkIns.length > 0) && (
          <div className="mt-8">
            <h2 className="mb-4 text-sm font-semibold">Journal de check-in</h2>
            <div className="flex flex-col gap-4">
              {ceremonyRows.filter((r) => r.checkIns.length > 0).map((row) => (
                <div key={row.id} className="overflow-hidden rounded-xl border border-border bg-background">
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <p className="text-sm font-medium">{row.label}</p>
                    <span className="text-xs text-muted-foreground">
                      {row.checkIns.length} arrivée{row.checkIns.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {row.checkIns.map((ci, i) => (
                        <tr key={i}>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              <span>{ci.guestName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                            {new Intl.DateTimeFormat("fr-FR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(ci.arrivedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        <CollaboratorManager
          weddingId={weddingId}
          currentUserId={session.user.id!}
          canManage={canInviteCollaborators}
        />
      </main>
    </div>
  );
}
