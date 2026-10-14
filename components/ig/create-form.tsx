"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { socialStoragePath } from "@/lib/media-paths";
import { cn } from "@/lib/utils";
import {
  createPostAction,
  createStoryAction,
  discardUploadsAction,
  preflightPostAction,
  type UploadedMedia,
} from "@/app/(app)/create/actions";
import { ClubAvatar } from "@/components/ig/avatars";
import type { ClubMediaUsage } from "@/lib/media";

export interface CreatableClub {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  usage: ClubMediaUsage;
}

type Mode = "post" | "story";
const ACCEPT = "image/png,image/jpeg,image/webp,video/mp4,video/quicktime";

export function CreateForm({ clubs }: { clubs: CreatableClub[] }) {
  const router = useRouter();
  const [clubId, setClubId] = useState(clubs[0]!.id);
  const [mode, setMode] = useState<Mode>("post");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const club = clubs.find((c) => c.id === clubId)!;
  const busy = status !== null;

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function pick(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    setError(null);
    setFiles((prev) => (mode === "story" ? picked.slice(0, 1) : [...prev, ...picked].slice(0, 10)));
    if (input.current) input.current.value = "";
  }

  async function submit() {
    if (files.length === 0) return;
    setError(null);
    const supabase = createClient();
    const isVideo = (f: File) => f.type.startsWith("video/");

    if (mode === "post") {
      setStatus("Checking your package…");
      const pre = await preflightPostAction(clubId, files.filter((f) => !isVideo(f)).length, files.filter(isVideo).length);
      if ("error" in pre) {
        setStatus(null);
        setError(pre.error ?? "Something went wrong.");
        return;
      }
    }

    const uploaded: UploadedMedia[] = [];
    for (const [i, file] of files.entries()) {
      setStatus(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : "Uploading…");
      const storagePath = socialStoragePath(clubId, mode === "post" ? "posts" : "stories", file.name);
      const { error: uploadError } = await supabase.storage.from("club-gallery").upload(storagePath, file);
      if (uploadError) {
        await discardUploadsAction(clubId, uploaded.map((u) => u.storagePath));
        setStatus(null);
        setError(`Upload failed: ${uploadError.message}`);
        return;
      }
      uploaded.push({ storagePath, kind: isVideo(file) ? "post_video" : "post_photo", sizeBytes: file.size });
    }

    setStatus("Sharing…");
    if (mode === "post") {
      const res = await createPostAction({ clubId, caption, media: uploaded });
      if ("error" in res) {
        setStatus(null);
        setError(res.error ?? "Something went wrong.");
        return;
      }
      router.push(`/p/${res.postId}`);
    } else {
      const res = await createStoryAction({
        clubId,
        storagePath: uploaded[0]!.storagePath,
        kind: uploaded[0]!.kind === "post_video" ? "video" : "photo",
      });
      if ("error" in res) {
        setStatus(null);
        setError(res.error ?? "Something went wrong.");
        return;
      }
      router.push(`/stories/${club.slug}`);
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Club picker */}
      {clubs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {clubs.map((c) => (
            <button
              key={c.id}
              onClick={() => setClubId(c.id)}
              disabled={busy}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm",
                c.id === clubId && "border-foreground font-semibold",
              )}
            >
              <ClubAvatar url={c.logo_url} name={c.name} size={24} />
              {c.slug}
            </button>
          ))}
        </div>
      )}

      {/* Post / Story */}
      <div className="grid grid-cols-2 rounded-lg bg-secondary p-1 text-sm font-semibold">
        {(["post", "story"] as const).map((m) => (
          <button
            key={m}
            disabled={busy}
            onClick={() => {
              setMode(m);
              if (m === "story") setFiles((f) => f.slice(0, 1));
            }}
            className={cn("rounded-md py-1.5 capitalize", mode === m && "bg-background shadow-sm")}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Media */}
      {files.length === 0 ? (
        <button
          onClick={() => input.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed text-muted-foreground hover:bg-accent",
            mode === "story" ? "aspect-[9/16] max-h-[60vh] mx-auto w-full max-w-[320px]" : "aspect-square w-full",
          )}
        >
          <ImagePlus className="size-12" strokeWidth={1.25} />
          <span className="text-sm font-semibold text-foreground">Select photos or videos</span>
          {mode === "post" && <span className="text-xs">Up to 10 per post</span>}
        </button>
      ) : (
        <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x">
          {files.map((f, i) => (
            <div
              key={previews[i] ?? i}
              className={cn(
                "relative shrink-0 snap-start overflow-hidden rounded-lg bg-black",
                mode === "story" ? "aspect-[9/16] h-[60vh] mx-auto" : files.length === 1 ? "aspect-square w-full" : "aspect-square w-[70%]",
              )}
            >
              {previews[i] &&
                (f.type.startsWith("video/") ? (
                  <video src={previews[i]} className="h-full w-full object-cover" muted autoPlay loop playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[i]} alt="" className="h-full w-full object-cover" />
                ))}
              {!busy && (
                <button
                  aria-label="Remove"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
          {mode === "post" && files.length < 10 && !busy && (
            <button
              onClick={() => input.current?.click()}
              className="flex aspect-square w-24 shrink-0 items-center justify-center self-center rounded-lg border-2 border-dashed text-muted-foreground"
              aria-label="Add more"
            >
              <ImagePlus className="size-6" />
            </button>
          )}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple={mode === "post"}
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />

      {mode === "post" && (
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={2200}
          rows={3}
          disabled={busy}
          placeholder="Write a caption…"
          className="w-full resize-none rounded-lg border bg-transparent p-3 text-sm outline-none focus:border-foreground/40"
        />
      )}

      <p className="text-xs text-muted-foreground">
        {mode === "post"
          ? `${club.usage.tierName} package: ${club.usage.photoCount}/${club.usage.photoQuota} photos · ${club.usage.videoCount}/${club.usage.videoQuota} videos used`
          : "Stories disappear after 24 hours and don't count toward your package."}
      </p>

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <button
        onClick={submit}
        disabled={busy || files.length === 0}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {status ?? (mode === "post" ? "Share post" : "Share to story")}
      </button>
    </div>
  );
}
