import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Club, Member, PermissionKey } from "@/lib/types";

export interface ClubContext {
  club: Club;
  userId: string | null;
  membership: Member | null;
  permissions: Set<PermissionKey>;
  staffRoles: string[];
}

/** Loads a club by slug plus the current viewer's membership + permission set within it. */
export async function getClubContext(slug: string): Promise<ClubContext> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data: club } = await supabase.from("clubs").select("*").eq("slug", slug).maybeSingle();
  if (!club) notFound();

  let membership: Member | null = null;
  const permissions = new Set<PermissionKey>();
  const staffRoles: string[] = [];

  if (userId) {
    const [{ data: memberRow }, { data: roleRows }] = await Promise.all([
      supabase.from("members").select("*").eq("club_id", club.id).eq("user_id", userId).maybeSingle(),
      supabase
        .from("user_role_assignments")
        .select("roles(name, role_permissions(permissions(key)))")
        .eq("club_id", club.id)
        .eq("user_id", userId),
    ]);

    membership = memberRow ?? null;

    for (const row of roleRows ?? []) {
      const role = row.roles as unknown as {
        name: string;
        role_permissions: { permissions: { key: PermissionKey } }[];
      } | null;
      if (!role) continue;
      staffRoles.push(role.name);
      for (const rp of role.role_permissions ?? []) {
        if (rp.permissions?.key) permissions.add(rp.permissions.key);
      }
    }
  }

  return { club, userId, membership, permissions, staffRoles };
}

export function can(ctx: ClubContext, ...keys: PermissionKey[]) {
  return keys.some((k) => ctx.permissions.has(k));
}
