"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function voteEventAction(eventId: string, value: 1 | -1) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "auth_required" as const };

  const userId = userData.user.id;

  const { data: existing } = await supabase
    .from("event_votes")
    .select("id, value")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing && existing.value === value) {
    await supabase.from("event_votes").delete().eq("id", existing.id);
  } else if (existing) {
    await supabase.from("event_votes").update({ value }).eq("id", existing.id);
  } else {
    await supabase.from("event_votes").insert({ event_id: eventId, user_id: userId, value });
  }

  revalidatePath("/");
  return { ok: true };
}
