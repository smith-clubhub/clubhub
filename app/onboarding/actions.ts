"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ClubCategory } from "@/lib/types";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createClubAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "other") as ClubCategory;
  const currency = String(formData.get("currency") ?? "ZAR").trim() || "ZAR";
  const timezone = String(formData.get("timezone") ?? "Africa/Johannesburg").trim();

  if (!name) {
    return { error: "Club name is required." };
  }

  const baseSlug = slugify(name) || "club";
  let slug = baseSlug;

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: club, error } = await supabase.rpc("create_club_with_owner", {
      p_name: name,
      p_slug: slug,
      p_description: description,
      p_category: category,
      p_currency: currency,
      p_timezone: timezone,
    });

    if (!error && club) {
      redirect(`/c/${club.slug}/admin`);
    }

    if (error?.message?.includes("duplicate key") || error?.code === "23505") {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      continue;
    }

    return { error: error?.message ?? "Could not create club." };
  }

  return { error: "Could not find an available club URL, please try a different name." };
}
