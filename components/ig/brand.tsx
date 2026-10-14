"use client";

import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The ClubHub wave-globe mark (public/brand/mark.png) redrawn as SVG so it can
 * take any colour: a disc cut by three rounded chevron "waves".
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={cn("shrink-0", className)} aria-hidden="true">
      <defs>
        <mask id={id}>
          <rect width="100" height="100" fill="white" />
          {[15, 46, 77].map((y) => (
            <path
              key={y}
              d={`M -14 ${y + 25} L 41 ${y + 2.5} Q 50 ${y - 1.5} 59 ${y + 2.5} L 114 ${y + 25}`}
              fill="none"
              stroke="black"
              strokeWidth="15.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </mask>
      </defs>
      <circle cx="50" cy="50" r="50" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

/** "club" over a widely-tracked "HUB", as in the logo. */
export function Wordmark({ className, withMark = true }: { className?: string; withMark?: boolean }) {
  return (
    <Link href="/" aria-label="ClubHub home" className={cn("inline-flex items-center gap-2 text-primary", className)}>
      {withMark && <BrandMark size={30} />}
      <span className="inline-flex flex-col items-center leading-none">
        <span className="text-[28px] font-bold tracking-[-0.045em]">club</span>
        <span className="-mr-[0.85em] mt-0.5 text-[7.5px] font-medium tracking-[0.85em]">HUB</span>
      </span>
    </Link>
  );
}
