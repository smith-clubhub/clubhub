"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, MapPin, MessageCircle, PlusSquare, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ig/avatars";

export interface NavViewer {
  username: string;
  avatarUrl: string | null;
  unreadNotifications: number;
  unreadMessages: number;
}

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}

const HOME: Item = { href: "/", label: "Home", icon: Home, match: (p) => p === "/" };
const SEARCH: Item = { href: "/explore", label: "Search", icon: Search, match: (p) => p.startsWith("/explore") };
const MAP: Item = { href: "/map", label: "Map", icon: MapPin, match: (p) => p.startsWith("/map") };
const CREATE: Item = { href: "/create", label: "Create", icon: PlusSquare, match: (p) => p.startsWith("/create") };
const MESSAGES: Item = { href: "/direct", label: "Messages", icon: MessageCircle, match: (p) => p.startsWith("/direct") };
const ACTIVITY: Item = { href: "/activity", label: "Notifications", icon: Heart, match: (p) => p.startsWith("/activity") };

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("font-script text-3xl leading-none tracking-tight", className)}>
      ClubHub
    </Link>
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff3040] text-white text-[11px] font-semibold leading-[18px] text-center">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function NavIcon({ item, active, count = 0 }: { item: Item; active: boolean; count?: number }) {
  const Icon = item.icon;
  return (
    <span className="relative inline-flex">
      <Icon className="size-[26px]" strokeWidth={active ? 2.75 : 1.75} />
      <Badge count={count} />
    </span>
  );
}

function ProfileIcon({ viewer, active }: { viewer: NavViewer | null; active: boolean }) {
  return (
    <span className={cn("rounded-full", active && "ring-2 ring-foreground ring-offset-1 ring-offset-background")}>
      <UserAvatar url={viewer?.avatarUrl ?? null} name={viewer?.username ?? "?"} size={26} />
    </span>
  );
}

/** Instagram-style chrome: top bar + bottom tab bar on mobile, left rail on desktop. */
export function AppNav({ viewer }: { viewer: NavViewer | null }) {
  const pathname = usePathname();
  const profileHref = viewer ? "/profile" : "/auth/login";
  const profileActive = pathname.startsWith("/profile");
  const showTopBar = pathname === "/";

  return (
    <>
      {/* Mobile top bar (home only, like Instagram) */}
      {showTopBar && (
        <header className="md:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 bg-background/95 backdrop-blur border-b">
          <Wordmark />
          <div className="flex items-center gap-5">
            <Link href={ACTIVITY.href} aria-label="Notifications">
              <NavIcon item={ACTIVITY} active={false} count={viewer?.unreadNotifications ?? 0} />
            </Link>
            <Link href={MESSAGES.href} aria-label="Messages">
              <NavIcon item={MESSAGES} active={false} count={viewer?.unreadMessages ?? 0} />
            </Link>
          </div>
        </header>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-[52px] pb-[env(safe-area-inset-bottom)] box-content bg-background border-t flex items-center justify-around">
        {[HOME, SEARCH, MAP, CREATE].map((item) => (
          <Link key={item.href} href={item.href} aria-label={item.label} className="p-2">
            <NavIcon item={item} active={item.match(pathname)} />
          </Link>
        ))}
        <Link href={profileHref} aria-label="Profile" className="p-2">
          <ProfileIcon viewer={viewer} active={profileActive} />
        </Link>
      </nav>

      {/* Desktop left rail */}
      <nav className="hidden md:flex fixed inset-y-0 left-0 z-30 w-[72px] xl:w-[244px] flex-col border-r bg-background px-3 pt-8 pb-5">
        <div className="h-[73px] px-3">
          <Wordmark className="hidden xl:block" />
          <Link href="/" aria-label="Home" className="xl:hidden">
            <span className="ig-gradient-text font-script text-3xl">C</span>
          </Link>
        </div>
        <div className="flex flex-col gap-1">
          {[HOME, SEARCH, MAP, MESSAGES, ACTIVITY, CREATE].map((item) => {
            const active = item.match(pathname);
            const count =
              item === MESSAGES ? viewer?.unreadMessages : item === ACTIVITY ? viewer?.unreadNotifications : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 rounded-lg p-3 hover:bg-accent transition-colors",
                  active && "font-bold",
                )}
              >
                <NavIcon item={item} active={active} count={count ?? 0} />
                <span className="hidden xl:inline text-[15px]">{item.label}</span>
              </Link>
            );
          })}
          <Link
            href={profileHref}
            className={cn(
              "flex items-center gap-4 rounded-lg p-3 hover:bg-accent transition-colors",
              profileActive && "font-bold",
            )}
          >
            <ProfileIcon viewer={viewer} active={profileActive} />
            <span className="hidden xl:inline text-[15px]">{viewer ? "Profile" : "Log in"}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
