import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ig/app-shell";
import { EditProfileForm } from "@/components/ig/edit-profile-form";
import type { Profile } from "@/lib/types";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login?next=/profile/edit");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single();

  return (
    <main className="mx-auto w-full max-w-[600px]">
      <PageHeader title="Edit profile" />
      <EditProfileForm profile={profile as Profile} />
    </main>
  );
}
