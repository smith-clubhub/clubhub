"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bookmark, Flame, MapPin, MessageSquare, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { setLikeAction, setSaveAction } from "@/app/(app)/social-actions";
import { ClubAvatar } from "@/components/ig/avatars";
import { PostMedia } from "@/components/ig/post-media";
import { ShareButton } from "@/components/ig/share-button";
import { formatKm, useDistanceKm } from "@/components/ig/geolocation-provider";
import { useAuthGate } from "@/components/ig/use-auth-gate";
import { formatMoney } from "@/lib/membership";
import { isTonight, sastParts, timeAgo } from "@/lib/time";
import type { PostFeedItem } from "@/lib/types";

export interface PostViewerState {
  liked: boolean;
  saved: boolean;
}

export function PostCard({
  post,
  viewer,
  isAuthenticated,
  storyRing = "none",
  showAllCaption = false,
}: {
  post: PostFeedItem;
  viewer: PostViewerState;
  isAuthenticated: boolean;
  storyRing?: "unseen" | "seen" | "none";
  showAllCaption?: boolean;
}) {
  const gate = useAuthGate();
  const [liked, setLiked] = useState(viewer.liked);
  const [saved, setSaved] = useState(viewer.saved);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [burst, setBurst] = useState(0);
  const [captionOpen, setCaptionOpen] = useState(showAllCaption);
  const [, startTransition] = useTransition();
  const km = useDistanceKm(post.latitude, post.longitude);

  function applyLike(next: boolean) {
    if (!isAuthenticated) return gate();
    if (next === liked) return;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const res = await setLikeAction(post.id, next);
      if ("error" in res) {
        setLiked(!next);
        setLikeCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  function doubleTap() {
    if (!isAuthenticated) return gate();
    setBurst((b) => b + 1);
    applyLike(true);
  }

  function toggleSave() {
    if (!isAuthenticated) return gate();
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await setSaveAction(post.id, next);
      if ("error" in res) setSaved(!next);
    });
  }

  const clubHref = `/c/${post.club_slug}`;
  const caption = post.kind === "event" ? null : post.caption;
  const longCaption = (caption?.length ?? 0) > 120;

  const when = post.event_start_at ? sastParts(post.event_start_at) : null;
  const tonight = post.event_start_at ? isTonight(post.event_start_at) : false;

  return (
    <article className="mx-3 mb-5 overflow-hidden rounded-3xl border bg-card shadow-sm md:mx-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-3.5 py-3">
        <Link href={storyRing === "none" ? clubHref : `/stories/${post.club_slug}`}>
          <ClubAvatar url={post.club_logo_url} name={post.club_name} size={40} ring={storyRing} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link href={clubHref} className="block truncate font-semibold">
            {post.club_name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            @{post.club_slug} · {timeAgo(post.created_at)}
          </p>
        </div>
        {km != null && (
          <Link
            href="/map"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground"
          >
            <MapPin className="size-3.5" />
            {formatKm(km)}
          </Link>
        )}
      </div>

      {/* Media */}
      <div className="relative">
        <PostMedia media={post.media} fallbackTitle={post.event_title} onDoubleTap={doubleTap} />
        {burst > 0 && (
          <Flame
            key={burst}
            className="pointer-events-none absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 fill-primary text-white drop-shadow-xl animate-[flame-pop_900ms_ease-out_forwards]"
          />
        )}
        {tonight && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur">
            <span className="size-2 rounded-full bg-primary animate-[live-pulse_1.8s_infinite]" />
            Tonight
          </span>
        )}
      </div>

      {/* Event: ticket stub */}
      {post.kind === "event" && when && (
        <div className="relative mx-3.5 mt-3.5 flex items-stretch overflow-hidden rounded-2xl brand-gradient text-white">
          <div className="flex w-[72px] shrink-0 flex-col items-center justify-center py-2.5 leading-none">
            <span className="text-[11px] font-semibold uppercase tracking-widest opacity-90">{when.weekday}</span>
            <span className="text-3xl font-bold">{when.day}</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest opacity-90">{when.month}</span>
          </div>
          {/* perforation */}
          <div className="relative w-0 border-l-2 border-dashed border-white/50">
            <span className="absolute -left-[9px] -top-2 size-4 rounded-full bg-card" />
            <span className="absolute -bottom-2 -left-[9px] size-4 rounded-full bg-card" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 py-2.5 pl-3 pr-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{post.event_title}</p>
              <p className="truncate text-xs opacity-90">
                {when.time}
                {post.event_location ? ` · ${post.event_location}` : ""}
              </p>
            </div>
            <Link
              href={`/c/${post.club_slug}/events/${post.event_id}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-[#c63d0f] hover:bg-white/90"
            >
              <Ticket className="size-4" />
              {post.event_price_cents ? formatMoney(post.event_price_cents, post.event_currency ?? "ZAR") : "Free"}
            </Link>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={cn("flex items-center gap-1 px-2", post.media.length > 1 ? "pt-6" : "pt-2")}>
        <button
          onClick={() => applyLike(!liked)}
          aria-label={liked ? "Remove fire" : "Fire"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-semibold transition-all active:scale-90",
            liked ? "bg-accent text-primary" : "hover:bg-secondary",
          )}
        >
          <Flame className={cn("size-6", liked && "fill-primary")} />
          {likeCount > 0 && likeCount.toLocaleString("en-ZA")}
        </button>
        <Link
          href={`/p/${post.id}`}
          aria-label="Comments"
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          <MessageSquare className="size-6" />
          {post.comment_count > 0 && post.comment_count}
        </Link>
        <ShareButton
          kind="post"
          id={post.id}
          isAuthenticated={isAuthenticated}
          className="rounded-full px-2.5 py-1.5 hover:bg-secondary"
        />
        <button
          onClick={toggleSave}
          aria-label={saved ? "Unsave" : "Save"}
          className="ml-auto rounded-full px-2.5 py-1.5 hover:bg-secondary"
        >
          <Bookmark className={cn("size-6", saved && "fill-primary text-primary")} />
        </button>
      </div>

      {/* Caption */}
      <div className="space-y-1 px-3.5 pb-4 pt-1 text-sm">
        {caption && (
          <p className={cn("whitespace-pre-line break-words", !captionOpen && "line-clamp-2")}>{caption}</p>
        )}
        {caption && longCaption && !captionOpen && (
          <button onClick={() => setCaptionOpen(true)} className="font-semibold text-muted-foreground">
            more
          </button>
        )}
        {post.comment_count > 0 && !showAllCaption && (
          <Link href={`/p/${post.id}`} className="block text-muted-foreground">
            {post.comment_count === 1 ? "View 1 comment" : `View all ${post.comment_count} comments`}
          </Link>
        )}
      </div>
    </article>
  );
}
