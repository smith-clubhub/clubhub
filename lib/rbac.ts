import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PermissionKey } from "@/lib/types";

/**
 * Server-side tenant + RBAC guard. Postgres RLS (has_club_permission) is the
 * source of truth and the last line of defense; this re-checks the same
 * permission before a mutation runs so server actions fail with a clear
 * error instead of a silent RLS-denied no-op, per spec Section 6.1
 * ("RBAC enforced server-side on every endpoint, not just hidden in the UI").
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/login");
  return data.user;
}

export async function requireClubPermission(clubId: string, permission: PermissionKey) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data: allowed, error } = await supabase.rpc("has_club_permission", {
    uid: userData.user.id,
    cid: clubId,
    perm_key: permission,
  });

  if (error || !allowed) {
    throw new Error(`Not authorized: missing "${permission}" permission for this club.`);
  }

  return userData.user;
}

export async function hasClubPermission(clubId: string, permission: PermissionKey) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data: allowed } = await supabase.rpc("has_club_permission", {
    uid: userData.user.id,
    cid: clubId,
    perm_key: permission,
  });

  return Boolean(allowed);
}

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data: allowed } = await supabase.rpc("is_platform_admin", { uid: userData.user.id });
  if (!allowed) redirect("/");

  return userData.user;
}

export async function isPlatformAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data: allowed } = await supabase.rpc("is_platform_admin", { uid: userData.user.id });
  return Boolean(allowed);
}

export async function isClubMember(clubId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data } = await supabase
    .from("members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  return Boolean(data);
}
