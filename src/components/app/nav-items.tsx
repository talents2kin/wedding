"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, Mail, Settings, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const coupleNav = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/ceremonies", label: "Cérémonies", icon: CalendarDays },
  { href: "/guests", label: "Invités", icon: Users },
  { href: "/invitations", label: "Invitations", icon: Mail },
] as const;

const plannerNav = [
  { href: "/weddings", label: "Mes mariages", icon: LayoutDashboard },
  { href: "/weddings/calendar", label: "Calendrier", icon: CalendarDays },
] as const;

const bottomNav = [
  { href: "/settings", label: "Paramètres", icon: Settings, disabled: true },
  { href: "/support", label: "Support", icon: HelpCircle, disabled: true },
] as const;

type NavEntry = { href: string; label: string; icon: React.ElementType; disabled?: boolean };

function NavLink({ href, label, icon: Icon, disabled }: NavEntry) {
  const pathname = usePathname();
  // Match any locale prefix: /fr/dashboard or /dashboard
  const isActive = pathname === href || pathname.endsWith(href);

  if (disabled) {
    return (
      <span className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/50">
        <Icon className="h-4 w-4" />
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "border-l-2 border-primary bg-primary/8 pl-[10px] font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function MainNavItems({ isPlanner = false }: { isPlanner?: boolean }) {
  const nav = isPlanner ? plannerNav : coupleNav;
  return (
    <nav className="flex flex-col gap-0.5">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        Principal
      </p>
      {nav.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </nav>
  );
}

export function BottomNavItems() {
  return (
    <nav className="flex flex-col gap-0.5">
      {bottomNav.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </nav>
  );
}
