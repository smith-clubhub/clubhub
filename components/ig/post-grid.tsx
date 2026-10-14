import Link from "next/link";
import { CalendarDays, Copy, Flame, MessageSquare, Play } from "lucide-react";
import type { PostFeedItem } from "@/lib/types";

/** Instagram profile/explore grid: 3 square tiles per row, hover shows counts. */
export function PostGrid({ posts }: { posts: PostFeedItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-1 md:gap-1.5">
      {posts.map((p) => {
        const first = p.media[0];
        return (
          <Link key={p.id} href={`/p/${p.id}`} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
            {first ? (
              first.kind === "post_video" ? (
                <video src={first.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={first.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              )
            ) : (
              <div className="brand-tile flex h-full w-full items-center justify-center p-2 text-center text-xs font-bold text-white md:text-sm">
                <span className="line-clamp-4">{p.event_title ?? p.caption}</span>
              </div>
            )}
            <span className="absolute right-1.5 top-1.5 text-white drop-shadow">
              {p.kind === "event" ? (
                <CalendarDays className="size-4" />
              ) : p.media.length > 1 ? (
                <Copy className="size-4" />
              ) : first?.kind === "post_video" ? (
                <Play className="size-4 fill-white" />
              ) : null}
            </span>
            <span className="absolute inset-0 hidden items-center justify-center gap-5 bg-black/40 font-semibold text-white group-hover:flex">
              <span className="flex items-center gap-1.5">
                <Flame className="size-5 fill-white" /> {p.like_count}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="size-5 fill-white" /> {p.comment_count}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
