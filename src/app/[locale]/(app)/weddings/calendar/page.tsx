import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { LayoutList } from "lucide-react";
import { WeddingCalendar, type CalendarWedding } from "@/components/app/wedding-calendar";

function getStatus(date: Date): CalendarWedding["status"] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return "in-progress";
  if (d > today) return "upcoming";
  return "past";
}

export default async function WeddingsCalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const plannerAccount = await db.plannerAccount.findUnique({
    where: { userId: session.user.id },
    include: {
      weddings: {
        include: { ceremonies: { orderBy: { date: "asc" } } },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!plannerAccount) redirect("/dashboard");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendarWeddings: CalendarWedding[] = plannerAccount.weddings.map((w) => {
    const ceremonyDates = w.ceremonies
      .map((c) => c.date)
      .filter((d): d is Date => d !== null);
    // Status based on next upcoming ceremony; fall back to wedding date
    const nextUpcoming = ceremonyDates.find((d) => new Date(d) >= today);
    const positionDate = nextUpcoming ?? ceremonyDates[0] ?? w.date;
    return {
      id: w.id,
      name: w.name,
      date: w.date,
      ceremonyDates,
      status: getStatus(positionDate),
    };
  });

  return (
    <div className="flex flex-col">
      <header className="border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-tight">Calendrier</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Mariages positionnés par date de cérémonie{" · "}
              <Link
                href="/weddings"
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground"
              >
                <LayoutList className="h-3.5 w-3.5" />
                Vue liste
              </Link>
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-8 py-8">
        <WeddingCalendar weddings={calendarWeddings} />
      </main>
    </div>
  );
}
