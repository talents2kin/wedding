"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarWedding = {
  id: string;
  name: string;
  date: Date;
  /** dates to position on calendar; falls back to date if empty */
  ceremonyDates: Date[];
  status: "upcoming" | "in-progress" | "past";
};

type StatusFilter = "all" | "upcoming" | "in-progress" | "past";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "Tous",
  upcoming: "À venir",
  "in-progress": "En cours",
  past: "Passés",
};

const EVENT_CLASS: Record<string, string> = {
  upcoming: "bg-primary/15 text-primary border border-primary/20",
  "in-progress": "bg-emerald-500/15 text-emerald-700 border border-emerald-500/20",
  past: "bg-muted text-muted-foreground border border-border",
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-first week: 0=Mon … 6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7;

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  // Pad to complete last row
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export function WeddingCalendar({ weddings }: { weddings: CalendarWedding[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = filter === "all" ? weddings : weddings.filter((w) => w.status === filter);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const days = buildCalendarDays(year, month);

  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );

  function getEventsForDay(day: Date) {
    return filtered.flatMap((w) => {
      const dates = w.ceremonyDates.length > 0 ? w.ceremonyDates : [w.date];
      return dates.filter((d) => isSameDay(new Date(d), day)).map(() => w);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[160px] text-center text-sm font-semibold capitalize">
            {monthLabel}
          </span>
          <button
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                filter === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div
              key={d}
              className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border">
          {days.map((day, i) => {
            const isToday = day && isSameDay(day, today);
            const events = day ? getEventsForDay(day) : [];

            return (
              <div
                key={i}
                className={cn(
                  "min-h-[88px] p-2",
                  !day && "bg-muted/30",
                  isToday && "bg-primary/4"
                )}
              >
                {day && (
                  <>
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {day.getDate()}
                    </span>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {events.map((ev, j) => (
                        <div
                          key={j}
                          className={cn(
                            "truncate rounded px-1.5 py-0.5 text-[10px] font-medium",
                            EVENT_CLASS[ev.status]
                          )}
                          title={ev.name}
                        >
                          {ev.name}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
