"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ClubTabs({
  tabs,
}: {
  tabs: { key: string; label: string; href: string }[];
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b overflow-x-auto">
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href.endsWith("/admin") ? pathname === tab.href : pathname.startsWith(tab.href + "/"));
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap",
              isActive
                ? "border-brand-500 text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
