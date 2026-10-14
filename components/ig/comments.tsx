"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { addCommentAction, deleteCommentAction } from "@/app/(app)/social-actions";
import { UserAvatar } from "@/components/ig/avatars";
import { timeAgo } from "@/lib/time";
import type { PostComment, ProfilePublic } from "@/lib/types";

export function CommentRow({
  comment,
  author,
  canDelete,
}: {
  comment: PostComment;
  author: ProfilePublic | null;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const name = author?.username ?? "user";
  return (
    <li className="flex gap-3 group" style={{ opacity: pending ? 0.5 : 1 }}>
      <UserAvatar url={author?.avatar_url ?? null} name={name} size={32} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="break-words whitespace-pre-line">
          <span className="font-semibold mr-1.5">{name}</span>
          {comment.body}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo(comment.created_at)}</p>
      </div>
      {canDelete && (
        <button
          aria-label="Delete comment"
          onClick={() => startTransition(async () => void (await deleteCommentAction(comment.id, comment.post_id)))}
          className="self-start text-muted-foreground opacity-60 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  );
}

export function CommentComposer({ postId }: { postId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await addCommentAction(postId, body);
      if ("error" in res) setError("Couldn't post your comment. Try again.");
      else setBody("");
      input.current?.focus();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="fixed md:static bottom-[calc(92px+env(safe-area-inset-bottom))] inset-x-3 z-20 flex items-center gap-3 rounded-full border bg-background px-4 py-2.5 shadow-lg md:mt-2 md:shadow-none"
    >
      <input
        ref={input}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2200}
        placeholder="Add a comment…"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
      <button disabled={pending || !body.trim()} className="text-sm font-semibold text-primary disabled:opacity-40">
        Post
      </button>
    </form>
  );
}
