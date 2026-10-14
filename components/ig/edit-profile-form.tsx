"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateProfileAction, type ProfileFormState } from "@/app/(app)/profile/actions";
import { UserAvatar } from "@/components/ig/avatars";
import type { Profile } from "@/lib/types";

const field = "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";

export function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, {});
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [avatarPath, setAvatarPath] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) router.push("/profile");
  }, [state.ok, router]);

  async function upload(file: File) {
    setUploadError(null);
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    setUploading(false);
    if (error) return setUploadError(error.message);
    setAvatarPath(path);
    setAvatarUrl(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
  }

  return (
    <form action={action} className="flex flex-col gap-5 p-4">
      <div className="flex items-center gap-4 rounded-xl bg-secondary p-4">
        <UserAvatar url={avatarUrl} name={profile.username} size={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{profile.username}</p>
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Change photo"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <input type="hidden" name="avatar_path" value={avatarPath} />
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Username
        <input name="username" defaultValue={profile.username} className={field} required minLength={3} maxLength={30} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          First name
          <input name="first_name" defaultValue={profile.first_name ?? ""} className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Last name
          <input name="last_name" defaultValue={profile.last_name ?? ""} className={field} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Bio
        <textarea name="bio" defaultValue={profile.bio ?? ""} maxLength={150} rows={3} className={`${field} resize-none`} />
      </label>

      {state.error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>}

      <button
        disabled={pending || uploading}
        className="rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Saving…" : "Submit"}
      </button>
    </form>
  );
}
