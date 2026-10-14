import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getClubMediaUsage } from "@/lib/media";
import { PageHeader } from "@/components/ig/app-shell";
import { CreateForm, type CreatableClub } from "@/components/ig/create-form";

export default async function CreatePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login?next=/create");
  const userId = userData.user.id;

  const { data: assignments } = await supabase
    .from("user_role_assignments")
    .select("club_id, clubs(id, name, slug, logo_url)")
    .eq("user_id", userId)
    .not("club_id", "is", null);

  const candidates = new Map<string, { id: string; name: string; slug: string; logo_url: string | null }>();
  for (const a of assignments ?? []) {
    const club = a.clubs as unknown as { id: string; name: string; slug: string; logo_url: string | null } | null;
    if (club) candidates.set(club.id, club);
  }

  const clubs: CreatableClub[] = [];
  for (const club of candidates.values()) {
    const { data: allowed } = await supabase.rpc("has_club_permission", {
      uid: userId,
      cid: club.id,
      perm_key: "posts.create",
    });
    if (allowed) clubs.push({ ...club, usage: await getClubMediaUsage(club.id) });
  }

  return (
    <main className="mx-auto w-full max-w-[560px]">
      <PageHeader title="New post" />
      {clubs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-8 py-20 text-center">
          <Store className="size-14" strokeWidth={1.25} />
          <p className="text-xl font-semibold">Only clubs can post</p>
          <p className="text-sm text-muted-foreground">
            Run a club? Put it on ClubHub to share posts, stories and events with people nearby.
          </p>
          <Link href="/onboarding" className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Add your club
          </Link>
        </div>
      ) : (
        <CreateForm clubs={clubs} />
      )}
    </main>
  );
}
