import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { RsvpForm } from "@/components/app/rsvp-form";

type Props = { params: Promise<{ token: string }> };

export default async function RsvpPage({ params }: Props) {
  const { token } = await params;

  const ceremony = await db.ceremony.findUnique({
    where: { registrationToken: token },
    include: { wedding: { select: { name: true, senderName: true } } },
  });

  if (!ceremony) notFound();

  const cerLabel =
    ceremony.type === "CUSTOM"
      ? (ceremony.customLabel ?? "Cérémonie")
      : { COUTUMIER: "Coutumier", CIVIL: "Civil", RELIGIEUX: "Religieux" }[ceremony.type] ?? ceremony.type;

  const dateStr = ceremony.date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(ceremony.date)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-rose-400">
            {ceremony.wedding.senderName ?? ceremony.wedding.name}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Votre invitation
          </h1>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-rose-300" />
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-gray-500">
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-medium text-rose-700">
              {cerLabel}
            </span>
            {dateStr && <span>{dateStr}</span>}
            {ceremony.venue && <span>· {ceremony.venue}</span>}
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm">
          <RsvpForm token={token} />
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Vos informations sont transmises directement aux organisateurs.
        </p>
      </div>
    </div>
  );
}
