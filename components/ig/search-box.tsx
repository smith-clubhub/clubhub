"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/** Debounced search input that drives ?q= on the current page. */
export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (value === initial) return;
    const t = setTimeout(() => {
      router.replace(value.trim() ? `${pathname}?q=${encodeURIComponent(value.trim())}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [value, initial, pathname, router]);

  return (
    <div className="sticky top-0 z-20 bg-background px-4 py-3 md:pt-6">
      <label className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search clubs and events"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          autoComplete="off"
        />
        {value && (
          <button type="button" onClick={() => setValue("")} aria-label="Clear search">
            <X className="size-4 text-muted-foreground" />
          </button>
        )}
      </label>
    </div>
  );
}
