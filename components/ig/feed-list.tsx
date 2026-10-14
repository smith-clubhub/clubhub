"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { loadFeedPageAction } from "@/app/(app)/feed-actions";
import { PostCard, type PostViewerState } from "@/components/ig/post-card";
import type { FeedMode } from "@/lib/feed";
import type { PostFeedItem } from "@/lib/types";

/** Infinite-scrolling list of PostCards; fetches the next page when the sentinel is near. */
export function FeedList({
  mode,
  initialPosts,
  initialViewerState,
  initialCursor,
  isAuthenticated,
  storyRings,
}: {
  mode: FeedMode;
  initialPosts: PostFeedItem[];
  initialViewerState: Record<string, PostViewerState>;
  initialCursor: string | null;
  isAuthenticated: boolean;
  storyRings: Record<string, "unseen" | "seen">;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [viewerState, setViewerState] = useState(initialViewerState);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || pending) return;
        startTransition(async () => {
          const page = await loadFeedPageAction(mode, cursor);
          setPosts((prev) => [...prev, ...page.posts.filter((p) => !prev.some((q) => q.id === p.id))]);
          setViewerState((prev) => ({ ...prev, ...page.viewerState }));
          setCursor(page.nextCursor);
        });
      },
      { rootMargin: "800px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, mode, pending]);

  return (
    <div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          viewer={viewerState[post.id] ?? { liked: false, saved: false }}
          isAuthenticated={isAuthenticated}
          storyRing={storyRings[post.club_id] ?? "none"}
        />
      ))}
      <div ref={sentinel} className="flex justify-center py-6 text-muted-foreground">
        {cursor ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          posts.length > 0 && <p className="text-sm">You&apos;re all caught up</p>
        )}
      </div>
    </div>
  );
}
