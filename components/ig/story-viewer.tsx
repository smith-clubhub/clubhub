"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { markStoryViewedAction } from "@/app/(app)/social-actions";
import { ClubAvatar } from "@/components/ig/avatars";
import { timeAgo } from "@/lib/time";
import type { StoryClub } from "@/lib/stories";

const PHOTO_MS = 5000;

/** Full-screen tap-through story viewer: tap right/left to move, hold to pause. */
export function StoryViewer({
  club,
  nextSlug,
  prevSlug,
  isAuthenticated,
}: {
  club: StoryClub;
  nextSlug: string | null;
  prevSlug: string | null;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const holdStart = useRef(0);
  const story = club.stories[index]!;

  const close = useCallback(() => router.push("/"), [router]);

  const next = useCallback(() => {
    if (index < club.stories.length - 1) {
      setIndex((i) => i + 1);
      setProgress(0);
    } else if (nextSlug) {
      router.replace(`/stories/${nextSlug}`);
    } else {
      close();
    }
  }, [index, club.stories.length, nextSlug, router, close]);

  const prev = useCallback(() => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setProgress(0);
    } else if (prevSlug) {
      router.replace(`/stories/${prevSlug}`);
    } else {
      setProgress(0);
    }
  }, [index, prevSlug, router]);

  useEffect(() => {
    if (isAuthenticated) void markStoryViewedAction(story.id);
  }, [story.id, isAuthenticated]);

  // Photo timer (videos drive progress from their own playback).
  useEffect(() => {
    if (story.kind !== "photo" || paused) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setProgress((p) => {
        const nextP = p + dt / PHOTO_MS;
        return nextP >= 1 ? 1 : nextP;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [story.id, story.kind, paused]);

  useEffect(() => {
    if (progress >= 1) next();
  }, [progress, next]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (paused) v.pause();
    else void v.play().catch(() => {});
  }, [paused, story.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, close]);

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    setPaused(false);
    if (Date.now() - holdStart.current > 250) return; // it was a hold, not a tap
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 3) prev();
    else next();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950">
      <div className="relative h-full w-full max-w-[min(100vw,calc(100dvh*9/16))] overflow-hidden bg-black md:my-4 md:h-[calc(100dvh-32px)] md:rounded-xl">
        {story.kind === "video" ? (
          <video
            key={story.id}
            ref={video}
            src={story.media_url}
            className="h-full w-full object-contain"
            autoPlay
            playsInline
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
            onEnded={next}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={story.id} src={story.media_url} alt="" className="h-full w-full object-contain" />
        )}

        {/* Tap zones */}
        <div
          className="absolute inset-0 select-none"
          onPointerDown={() => {
            holdStart.current = Date.now();
            setPaused(true);
          }}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setPaused(false)}
        />

        {/* Progress + header */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-3 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="flex gap-1">
            {club.stories.map((s, i) => (
              <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35">
                <div
                  className="h-full bg-white"
                  style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
                />
              </div>
            ))}
          </div>
          <div className="pointer-events-auto mt-3 flex items-center gap-2 text-white">
            <Link href={`/c/${club.slug}`} className="flex items-center gap-2">
              <ClubAvatar url={club.logoUrl} name={club.name} size={32} />
              <span className="text-sm font-semibold">{club.slug}</span>
            </Link>
            <span className="text-sm text-white/70">{timeAgo(story.created_at)}</span>
            <button onClick={close} aria-label="Close" className="ml-auto p-1">
              <X className="size-7" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
