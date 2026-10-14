"use client";

import { useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostMediaItem } from "@/lib/types";

/** Square, swipeable media carousel (scroll-snap), with dots and an index chip. */
export function PostMedia({
  media,
  fallbackTitle,
  onDoubleTap,
}: {
  media: PostMediaItem[];
  /** Shown on a gradient tile when an event post has no cover image. */
  fallbackTitle?: string | null;
  onDoubleTap?: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const lastTap = useRef(0);

  function handleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) onDoubleTap?.();
    lastTap.current = now;
  }

  function handleScroll() {
    const el = scroller.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  if (media.length === 0) {
    return (
      <div
        onClick={handleTap}
        className="aspect-square w-full ig-gradient flex flex-col items-center justify-center gap-3 p-8 text-white text-center select-none"
      >
        <CalendarDays className="size-10" strokeWidth={1.5} />
        <p className="text-2xl font-bold leading-tight line-clamp-4">{fallbackTitle}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scroller}
        onScroll={handleScroll}
        onClick={handleTap}
        className="flex aspect-square w-full overflow-x-auto snap-x snap-mandatory no-scrollbar bg-black"
      >
        {media.map((m, i) =>
          m.kind === "post_video" ? (
            <video
              key={i}
              src={m.url}
              className="h-full w-full shrink-0 snap-center object-cover"
              muted
              loop
              playsInline
              autoPlay
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={m.url} alt="" className="h-full w-full shrink-0 snap-center object-cover" draggable={false} />
          ),
        )}
      </div>
      {media.length > 1 && (
        <>
          <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            {index + 1}/{media.length}
          </span>
          <div className="absolute -bottom-5 inset-x-0 flex justify-center gap-1">
            {media.map((_, i) => (
              <span
                key={i}
                className={cn("size-1.5 rounded-full transition-colors", i === index ? "bg-primary" : "bg-border")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
