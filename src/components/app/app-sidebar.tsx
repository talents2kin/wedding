import { Heart } from "lucide-react";
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
      <div className="flex items-center gap-3 border-b border-border px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Heart className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-none">WeddingApp</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Mon compte</p>
        </div>
      </div>

      {/* Main navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <MainNavItems />
      </div>

      {/* Bottom navigation + sign-out */}
      <div className="border-t border-border px-3 py-3">
        <BottomNavItems />
        <SignOutButton />
      </div>

      {/* User info */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-none">{name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Couple</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
