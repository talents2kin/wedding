import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function PublicSeatingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const ceremony = await db.ceremony.findUnique({
    where: { seatingShareToken: token },
    include: {
      wedding: { select: { name: true, senderName: true } },
      tables: {
        orderBy: { position: "asc" },
        include: {
          seats: {
            include: { guest: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!ceremony) notFound();

  const ceremonyLabel =
    ceremony.customLabel ??
    ({ COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux", CUSTOM: "Personnalisé" }[ceremony.type] ?? ceremony.type);

  const dateStr = ceremony.date
    ? ceremony.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const totalSeated = ceremony.tables.reduce((s, t) => s + t.seats.length, 0);
  const totalCap    = ceremony.tables.reduce((s, t) => s + t.capacity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
      {/* Header */}
      <header className="border-b border-rose-100 bg-white/80 px-6 py-6 text-center backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">Plan de table</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{ceremony.wedding.name}</h1>
        {(ceremony.wedding.senderName) && (
          <p className="mt-0.5 text-sm text-gray-500">{ceremony.wedding.senderName}</p>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm text-gray-600">
          <span className="rounded-full bg-rose-100 px-3 py-1">{ceremonyLabel}</span>
          {dateStr && <span className="rounded-full bg-rose-100 px-3 py-1">{dateStr}</span>}
          {ceremony.venue && <span className="rounded-full bg-rose-100 px-3 py-1">{ceremony.venue}</span>}
        </div>
        <p className="mt-3 text-xs text-gray-400">{totalSeated} invités placés · {totalCap} places au total</p>
      </header>

      {/* Tables grid */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        {ceremony.tables.length === 0 ? (
          <div className="rounded-2xl bg-white/70 py-20 text-center text-gray-500">
            Aucune table configurée pour le moment.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ceremony.tables.map((table) => (
              <div key={table.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="flex items-center justify-between bg-rose-600 px-4 py-3">
                  <h2 className="text-sm font-semibold text-white">{table.name}</h2>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white">
                    {table.seats.length}/{table.capacity}
                  </span>
                </div>
                <ul className="divide-y divide-gray-50 px-4">
                  {table.seats.map((seat) => (
                    <li key={seat.guest.id} className="py-2 text-sm text-gray-700">
                      {seat.guest.name}
                    </li>
                  ))}
                  {table.seats.length === 0 && (
                    <li className="py-3 text-xs italic text-gray-400">Table vide</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="py-8 text-center text-xs text-gray-400">
        Vue en lecture seule · {ceremony.wedding.name}
      </footer>
    </div>
  );
}
