"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bookmark, Heart, MapPin, MessageCircle, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { setLikeAction, setSaveAction } from "@/app/(app)/social-actions";
import { ClubAvatar } from "@/components/ig/avatars";
import { PostMedia } from "@/components/ig/post-media";
import { ShareButton } from "@/components/ig/share-button";
import { formatKm, useDistanceKm } from "@/components/ig/geolocation-provider";
import { useAuthGate } from "@/components/ig/use-auth-gate";
import { formatMoney } from "@/lib/membership";
import { eventWhen, timeAgo } from "@/lib/time";
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

  return (
    <article className="border-b md:border md:rounded-lg pb-3 md:mb-4 bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Link href={storyRing === "none" ? clubHref : `/stories/${post.club_slug}`}>
          <ClubAvatar url={post.club_logo_url} name={post.club_name} size={36} ring={storyRing} />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1 text-sm">
            <Link href={clubHref} className="font-semibold truncate">
              {post.club_slug}
            </Link>
            <span className="text-muted-foreground">• {timeAgo(post.created_at)}</span>
          </div>
          {km != null && (
            <p className="text-xs text-muted-foreground flex items-center gap-0.5">
              <MapPin className="size-3" />
              {formatKm(km)} away
            </p>
          )}
        </div>
      </div>

      {/* Media */}
      <div className="relative">
        <PostMedia media={post.media} fallbackTitle={post.event_title} onDoubleTap={doubleTap} />
        {burst > 0 && (
          <Heart
            key={burst}
            className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow-lg animate-[heart-pop_900ms_ease-out_forwards]"
          />
        )}
      </div>

      {/* Event strip */}
      {post.kind === "event" && post.event_start_at && (
        <div className="mx-3 mt-3 flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{post.event_title}</p>
            <p className="text-xs text-muted-foreground truncate">
              {eventWhen(post.event_start_at)}
              {post.event_location ? ` · ${post.event_location}` : ""}
            </p>
          </div>
          <Link
            href={`/c/${post.club_slug}/events/${post.event_id}`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Ticket className="size-4" />
            {post.event_price_cents
              ? `Tickets · ${formatMoney(post.event_price_cents, post.event_currency ?? "ZAR")}`
              : "RSVP free"}
          </Link>
        </div>
      )}

      {/* Actions */}
      <div className={cn("flex items-center gap-4 px-3", post.media.length > 1 ? "pt-6" : "pt-3")}>
        <button onClick={() => applyLike(!liked)} aria-label={liked ? "Unlike" : "Like"} className="active:scale-90 transition-transform">
          <Heart className={cn("size-6", liked && "fill-[#ff3040] text-[#ff3040]")} />
        </button>
        <Link href={`/p/${post.id}`} aria-label="Comment">
          <MessageCircle className="size-6 -scale-x-100" />
        </Link>
        <ShareButton kind="post" id={post.id} isAuthenticated={isAuthenticated} />
        <button onClick={toggleSave} aria-label={saved ? "Unsave" : "Save"} className="ml-auto">
          <Bookmark className={cn("size-6", saved && "fill-foreground")} />
        </button>
      </div>

      {/* Meta */}
      <div className="px-3 pt-2 text-sm space-y-1">
        {likeCount > 0 && (
          <p className="font-semibold">
            {likeCount.toLocaleString("en-ZA")} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}
        {caption && (
          <p className={cn("whitespace-pre-line break-words", !captionOpen && "line-clamp-2")}>
            <Link href={clubHref} className="font-semibold mr-1.5">
              {post.club_slug}
            </Link>
            {caption}
          </p>
        )}
        {caption && longCaption && !captionOpen && (
          <button onClick={() => setCaptionOpen(true)} className="text-muted-foreground">
            more
          </button>
        )}
        {post.comment_count > 0 && !showAllCaption && (
          <Link href={`/p/${post.id}`} className="block text-muted-foreground">
            View {post.comment_count === 1 ? "1 comment" : `all ${post.comment_count} comments`}
          </Link>
        )}
      </div>
    </article>
  );
}
