"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ProfileFormState {
  error?: string;
  ok?: boolean;
}

export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Please log in again." };

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 150) || null;
  const firstName = String(formData.get("first_name") ?? "").trim().slice(0, 60) || null;
  const lastName = String(formData.get("last_name") ?? "").trim().slice(0, 60) || null;
  const avatarPath = String(formData.get("avatar_path") ?? "");

  if (!/^[a-z0-9._]{3,30}$/.test(username)) {
    return { error: "Usernames are 3–30 characters: letters, numbers, full stops and underscores." };
  }

  const update: Record<string, string | null> = { username, bio, first_name: firstName, last_name: lastName };
  if (avatarPath && avatarPath.startsWith(`${userData.user.id}/`)) {
    update.avatar_url = supabase.storage.from("avatars").getPublicUrl(avatarPath).data.publicUrl;
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", userData.user.id);
  if (error) {
    return { error: error.code === "23505" ? "That username is taken." : "Couldn't save your profile." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
