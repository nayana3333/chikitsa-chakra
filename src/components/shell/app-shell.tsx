"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, Bell } from "lucide-react";
import { cn, initialsOf } from "@/lib/utils";
import { Logo, ThemeToggle } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, Separator } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { NAV_BY_ROLE, ROLE_LABEL, type NavSection } from "./nav";
import type { SessionUser } from "@/lib/auth/dal";
import { logout } from "@/app/actions/auth";

export function AppShell({
  user,
  unreadCount = 0,
  children,
}: {
  user: SessionUser;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const sections = NAV_BY_ROLE[user.role];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <SidebarContent sections={sections} pathname={pathname} user={user} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="dialog-overlay absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-card shadow-xl">
            {/* Closing on click rather than on a pathname effect: tapping a link
                is the event that should dismiss the drawer, and handling it here
                avoids a render pass triggered by navigation. */}
            <SidebarContent
              sections={sections}
              pathname={pathname}
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>

          <div className="lg:hidden">
            <Logo showWordmark={false} size={30} />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/notifications"
              className="relative inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : "Notifications"
              }
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <ThemeToggle />

            <Separator orientation="vertical" className="mx-1 h-6" />

            <div className="flex items-center gap-2.5 pl-1">
              <Avatar>
                <AvatarFallback>
                  {initialsOf(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABEL[user.role]}
                </p>
              </div>
            </div>

            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Sign out"
              >
                <LogOut />
              </Button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  sections,
  pathname,
  user,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  user: SessionUser;
  /** Supplied only by the mobile drawer, which dismisses itself on navigation. */
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href={`/${user.role.toLowerCase()}`} className="rounded-md">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        {sections.map((section, i) => (
          <div key={section.heading ?? i}>
            {section.heading && (
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.heading}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                // Exact match for the dashboard root, prefix match for the rest —
                // otherwise "/patient" would light up on every child route.
                const isRoot = item.href.split("/").length === 2;
                const active = isRoot
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Badge variant="secondary" className="w-full justify-center py-1.5">
          {ROLE_LABEL[user.role]} workspace
        </Badge>
      </div>
    </>
  );
}
