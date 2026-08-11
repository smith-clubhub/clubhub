import { getClubContext, can } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClubSettingsForm } from "./club-settings-form";
import { RoleAssignmentForm } from "./role-assignment-form";
import { removeRoleAction } from "./actions";

type ProfileRef = { first_name: string | null; last_name: string | null; email: string | null } | null;

export default async function ClubSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);

  if (!can(ctx, "club.settings", "roles.manage")) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to club settings.</p>;
  }

  const supabase = await createClient();
  const [{ data: roles }, { data: assignments }] = await Promise.all([
    supabase.from("roles").select("id, name").eq("club_id", ctx.club.id).order("name"),
    supabase
      .from("user_role_assignments")
      .select("id, roles(name), profiles(first_name, last_name, email)")
      .eq("club_id", ctx.club.id),
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {can(ctx, "club.settings") && (
        <Card>
          <CardHeader>
            <CardTitle>Club settings</CardTitle>
          </CardHeader>
          <CardContent>
            <ClubSettingsForm club={ctx.club} />
          </CardContent>
        </Card>
      )}

      {can(ctx, "roles.manage") && (
        <Card>
          <CardHeader>
            <CardTitle>Staff &amp; roles</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <RoleAssignmentForm clubId={ctx.club.id} slug={slug} roles={roles ?? []} />
            <div className="flex flex-col gap-2">
              {(assignments ?? []).map((a) => {
                const profile = a.profiles as unknown as ProfileRef;
                const role = (a.roles as unknown as { name: string } | null)?.name;
                const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email;
                return (
                  <div key={a.id} className="flex items-center justify-between text-sm border-t pt-2">
                    <span>{name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{role}</Badge>
                      <form action={removeRoleAction}>
                        <input type="hidden" name="clubId" value={ctx.club.id} />
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="assignmentId" value={a.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Remove
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
