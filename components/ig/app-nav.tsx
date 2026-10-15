"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CircleUserRound, Compass, House, MessagesSquare, PlusCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ig/avatars";
import { BrandMark, Wordmark } from "@/components/ig/brand";

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

const HOME: Item = { href: "/", label: "Home", icon: House, match: (p) => p === "/" };
const SEARCH: Item = { href: "/explore", label: "Discover", icon: Compass, match: (p) => p.startsWith("/explore") };
const CREATE: Item = { href: "/create", label: "Create", icon: PlusCircle, match: (p) => p.startsWith("/create") };
const MESSAGES: Item = { href: "/direct", label: "Messages", icon: MessagesSquare, match: (p) => p.startsWith("/direct") };
const ACTIVITY: Item = { href: "/activity", label: "Activity", icon: Bell, match: (p) => p.startsWith("/activity") };
const isMap = (p: string) => p.startsWith("/map");

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold leading-[18px] text-center ring-2 ring-background">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function NavIcon({ item, active, count = 0 }: { item: Item; active: boolean; count?: number }) {
  const Icon = item.icon;
  return (
    <span className="relative inline-flex">
      <Icon className={cn("size-6", active && "text-primary")} strokeWidth={active ? 2.4 : 1.8} />
      <CountBadge count={count} />
    </span>
  );
}

function ActiveDot({ active }: { active: boolean }) {
  return <span className={cn("mt-1 size-1 rounded-full", active ? "bg-primary" : "bg-transparent")} />;
}

/**
 * ClubHub chrome. Mobile: branded top bar (home only) + floating pill tab bar
 * with the Map as the raised centre button. Desktop: left rail.
 */
export function AppNav({ viewer }: { viewer: NavViewer | null }) {
  const pathname = usePathname();
  const profileHref = viewer ? "/profile" : "/auth/login";
  const profileActive = pathname.startsWith("/profile");
  const mapActive = isMap(pathname);

  return (
    <>
      {/* Mobile top bar (home only) */}
      {pathname === "/" && (
        <header className="md:hidden sticky top-0 z-30 box-content h-16 pt-[env(safe-area-inset-top)] flex items-center justify-between px-4 bg-background/90 backdrop-blur-md">
          <Wordmark />
          <div className="flex items-center gap-2">
            <Link href={ACTIVITY.href} aria-label="Activity" className="rounded-full bg-secondary p-2.5">
              <NavIcon item={ACTIVITY} active={false} count={viewer?.unreadNotifications ?? 0} />
            </Link>
            <Link href={MESSAGES.href} aria-label="Messages" className="rounded-full bg-secondary p-2.5">
              <NavIcon item={MESSAGES} active={false} count={viewer?.unreadMessages ?? 0} />
            </Link>
          </div>
        </header>
      )}

      {/* Mobile floating tab bar */}
      <nav className="md:hidden fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 h-16 rounded-full border bg-background/90 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-around px-2">
        {[HOME, SEARCH].map((item) => (
          <Link key={item.href} href={item.href} aria-label={item.label} className="flex flex-col items-center px-3 pt-1">
            <NavIcon item={item} active={item.match(pathname)} />
            <ActiveDot active={item.match(pathname)} />
          </Link>
        ))}
        <Link
          href="/map"
          aria-label="Map — clubs near you"
          className={cn(
            "-mt-9 flex size-16 items-center justify-center rounded-full brand-gradient text-white shadow-[0_8px_24px_rgba(255,127,50,0.45)] ring-4 ring-background transition-transform active:scale-95",
            mapActive && "scale-105",
          )}
        >
          <BrandMark size={34} />
        </Link>
        <Link href={CREATE.href} aria-label={CREATE.label} className="flex flex-col items-center px-3 pt-1">
          <NavIcon item={CREATE} active={CREATE.match(pathname)} />
          <ActiveDot active={CREATE.match(pathname)} />
        </Link>
        <Link href={profileHref} aria-label="Profile" className="flex flex-col items-center px-3 pt-1">
          {viewer ? (
            <span className={cn("rounded-full", profileActive && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
              <UserAvatar url={viewer.avatarUrl} name={viewer.username} size={26} />
            </span>
          ) : (
            <CircleUserRound className="size-6" strokeWidth={1.8} />
          )}
          <ActiveDot active={profileActive} />
        </Link>
      </nav>

      {/* Desktop left rail */}
      <nav className="hidden md:flex fixed inset-y-0 left-0 z-30 w-[76px] xl:w-[248px] flex-col border-r bg-background px-3 pt-7 pb-5">
        <div className="mb-8 px-2">
          <Wordmark className="hidden xl:inline-flex" />
          <Link href="/" aria-label="Home" className="xl:hidden text-primary">
            <BrandMark size={34} />
          </Link>
        </div>

        <Link
          href="/map"
          className={cn(
            "mb-3 flex items-center gap-3 rounded-2xl p-3 text-white brand-gradient shadow-[0_6px_20px_rgba(255,127,50,0.35)] transition-transform hover:scale-[1.02]",
            mapActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
        >
          <BrandMark size={26} />
          <span className="hidden xl:flex flex-col leading-tight">
            <span className="font-semibold">Map</span>
            <span className="text-xs text-white/85">Clubs near you</span>
          </span>
        </Link>

        <div className="flex flex-col gap-1">
          {[HOME, SEARCH, MESSAGES, ACTIVITY, CREATE].map((item) => {
            const active = item.match(pathname);
            const count =
              item === MESSAGES ? viewer?.unreadMessages : item === ACTIVITY ? viewer?.unreadNotifications : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-secondary",
                  active && "bg-accent text-accent-foreground font-semibold",
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
              "flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-secondary",
              profileActive && "bg-accent text-accent-foreground font-semibold",
            )}
          >
            {viewer ? (
              <UserAvatar url={viewer.avatarUrl} name={viewer.username} size={24} />
            ) : (
              <CircleUserRound className="size-6" strokeWidth={1.8} />
            )}
            <span className="hidden xl:inline text-[15px]">{viewer ? "Profile" : "Log in"}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
