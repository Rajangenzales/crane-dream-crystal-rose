import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Profile, Settings as AppSettings } from "@/lib/types";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "Clients", icon: Building2 },
  { to: "/reports", label: "Reports", icon: ClipboardList },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/services", label: "Services", icon: BookOpen },
] as const;

const ADMIN_NAV = [
  { to: "/users", label: "Users", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({
  children,
  profile,
  settings,
}: {
  children: ReactNode;
  profile: Profile;
  settings: AppSettings;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = profile.role === "admin" ? [...NAV, ...ADMIN_NAV] : [...NAV];
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card px-4 py-5 md:flex">
        <Brand name={settings.agencyName} />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <NavLink key={item.to} {...item} pathname={pathname} />
          ))}
        </nav>
        <div className="border-t border-border pt-4">
          <UserButton />
          <p className="mt-2 text-xs text-muted-foreground capitalize">{profile.role}</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand name={settings.agencyName} compact />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-card">
            <SheetTitle className="font-display text-2xl">{settings.agencyName}</SheetTitle>
            <nav className="mt-6 flex flex-col gap-1">
              {items.map((item) => (
                <NavLink key={item.to} {...item} pathname={pathname} onClick={() => setOpen(false)} />
              ))}
            </nav>
            <div className="mt-8">
              <UserButton />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="md:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-10">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-card/95 px-1 py-1 backdrop-blur md:hidden">
        {NAV.slice(0, 4).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium",
              isActive(pathname, item.to, "end" in item && item.end) ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Brand({ name, compact }: { name: string; compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-lg leading-none">
        M
      </span>
      <span className={cn("font-display text-xl tracking-tight", compact && "text-lg")}>{name}</span>
    </Link>
  );
}

function NavLink({
  to,
  label,
  icon: Icon,
  pathname,
  end,
  onClick,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  pathname: string;
  end?: boolean;
  onClick?: () => void;
}) {
  const active = isActive(pathname, to, end);
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-150",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function isActive(pathname: string, to: string, end?: boolean) {
  if (to === "/" || end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}
