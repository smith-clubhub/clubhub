import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default async function MyClubHubPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const [{ data: memberships }, { data: staffRoles }] = await Promise.all([
    supabase
      .from("members")
      .select("id, status, club_id, clubs(id, name, slug, category, status)")
      .eq("user_id", user.id),
    supabase
      .from("user_role_assignments")
      .select("club_id, roles(name), clubs(id, name, slug, category, status)")
      .not("club_id", "is", null),
  ]);

  type ClubRef = { id: string; name: string; slug: string; category: string; status: string };

  const staffByClub = new Map<string, string[]>();
  for (const row of staffRoles ?? []) {
    const club = row.clubs as unknown as ClubRef | null;
    const role = (row.roles as unknown as { name: string } | null)?.name;
    if (!club || !role) continue;
    staffByClub.set(club.id, [...(staffByClub.get(club.id) ?? []), role]);
  }

  const clubsById = new Map<string, { club: ClubRef; memberStatus?: string; roles: string[] }>();
  for (const m of memberships ?? []) {
    const club = m.clubs as unknown as ClubRef | null;
    if (!club) continue;
    clubsById.set(club.id, { club, memberStatus: m.status, roles: staffByClub.get(club.id) ?? [] });
  }
  for (const [clubId, roles] of staffByClub) {
    if (!clubsById.has(clubId)) {
      const club = (staffRoles ?? []).find((r) => r.club_id === clubId)?.clubs as unknown as ClubRef | undefined;
      if (club) clubsById.set(clubId, { club, roles });
    }
  }

  const clubs = [...clubsById.values()];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">My ClubHub</h1>
        <p className="text-muted-foreground">
          Everything you manage or belong to, in one place.
        </p>
      </div>

      {clubs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re not part of a club yet</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <p className="text-sm text-muted-foreground">
              Start a new club to manage members, events and payments, or join one
              using the invite link or club code a club shared with you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link href="/onboarding">Start a club</Link>
              </Button>
              <JoinBySlugForm />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map(({ club, memberStatus, roles }) => (
              <Card key={club.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    {club.name}
                    {club.status !== "active" && (
                      <Badge variant="outline">{club.status}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {memberStatus && <Badge>{memberStatus}</Badge>}
                    {roles.map((r) => (
                      <Badge key={r} variant="secondary">
                        {r}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/c/${club.slug}`}>Open</Link>
                    </Button>
                    {roles.length > 0 && (
                      <Button asChild size="sm">
                        <Link href={`/c/${club.slug}/admin`}>Manage</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <Button asChild variant="outline">
              <Link href="/onboarding">Start another club</Link>
            </Button>
            <JoinBySlugForm />
          </div>
        </>
      )}
    </div>
  );
}

function JoinBySlugForm() {
  return (
    <form action="/c/redirect" className="flex gap-2 items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="slug" className="text-xs text-muted-foreground">
          Have a club code?
        </Label>
        <Input id="slug" name="slug" placeholder="e.g. riverside-golf-club" className="w-56" />
      </div>
      <Button type="submit" variant="secondary">
        Go
      </Button>
    </form>
  );
}
