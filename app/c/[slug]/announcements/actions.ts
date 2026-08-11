"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markReadAction(formData: FormData) {
  const slug = String(formData.get("slug"));
  const notificationId = String(formData.get("notificationId"));

  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId);

  revalidatePath(`/c/${slug}/announcements`);
}
