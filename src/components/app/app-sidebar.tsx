import { Heart, ChevronDown } from "lucide-react";
import { auth } from "@/lib/auth";
import { MainNavItems, BottomNavItems } from "./nav-items";
import { SignOutButton } from "./sign-out-button";

export async function AppSidebar() {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "Mon compte";
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Heart className="h-4 w-4" />
        </div>
        <p className="truncate text-sm font-bold">WeddingApp</p>
      </div>

      {/* Main navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <MainNavItems />
      </div>

      {/* Bottom links */}
      <div className="px-3 pb-2">
        <BottomNavItems />
      </div>

      {/* User footer */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-none">{name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Compte couple</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
        <div className="mt-1">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
