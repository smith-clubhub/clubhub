import Link from "next/link";
import { getClubContext } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/club-context";
import { computeEffectiveStatus } from "@/lib/membership";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select-native";
import { AddMemberForm } from "./add-member-form";

type ProfileRef = { first_name: string | null; last_name: string | null; email: string | null } | null;

export default async function MembersDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string; planId?: string }>;
}) {
  const { slug } = await params;
  const { q, status, planId } = await searchParams;
  const ctx = await getClubContext(slug);
  const clubId = ctx.club.id;
  const supabase = await createClient();

  const canView = can(ctx, "members.view");
  const canEdit = can(ctx, "members.edit");
  const canExport = can(ctx, "members.export");

  if (!canView) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to the member directory.</p>;
  }

  let query = supabase
    .from("members")
    .select("id, status, member_number, joined_at, expires_at, membership_plan_id, profiles(first_name, last_name, email), membership_plans(name, grace_period_days)")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (planId) query = query.eq("membership_plan_id", planId);

  if (q) {
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("id")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`);
    const ids = (matchingProfiles ?? []).map((p) => p.id);
    const orParts = [`member_number.ilike.%${q}%`];
    if (ids.length > 0) orParts.push(`user_id.in.(${ids.join(",")})`);
    query = query.or(orParts.join(","));
  }

  const { data: members } = await query;
  const { data: plans } = await supabase.from("membership_plans").select("id, name").eq("club_id", clubId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <form className="flex flex-wrap gap-2 items-end" method="get">
          <Input name="q" placeholder="Search name, email, member #" defaultValue={q} className="w-56" />
          <Select name="status" defaultValue={status ?? ""}>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </Select>
          <Select name="planId" defaultValue={planId ?? ""}>
            <SelectItem value="">All plans</SelectItem>
            {(plans ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
        {canExport && (
          <Button asChild variant="outline">
            <a href={`/c/${slug}/admin/members/export?${new URLSearchParams({ q: q ?? "", status: status ?? "", planId: planId ?? "" }).toString()}`}>
              Export CSV
            </a>
          </Button>
        )}
      </div>

      {canEdit && <AddMemberForm clubId={clubId} slug={slug} plans={plans ?? []} />}

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2 font-medium">Name</th>
              <th className="p-2 font-medium">Status</th>
              <th className="p-2 font-medium">Plan</th>
              <th className="p-2 font-medium">Joined</th>
              <th className="p-2 font-medium">Expires</th>
              <th className="p-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => {
              const profile = m.profiles as unknown as ProfileRef;
              const plan = m.membership_plans as unknown as { name: string; grace_period_days: number } | null;
              const effective = computeEffectiveStatus({ status: m.status, expires_at: m.expires_at }, plan);
              const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email || "—";
              return (
                <tr key={m.id} className="border-t">
                  <td className="p-2">
                    <Link href={`/c/${slug}/admin/members/${m.id}`} className="hover:underline">
                      {name}
                    </Link>
                  </td>
                  <td className="p-2">
                    <Badge variant={effective === "active" ? "default" : "secondary"}>{effective}</Badge>
                  </td>
                  <td className="p-2">{plan?.name ?? "—"}</td>
                  <td className="p-2">{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : "—"}</td>
                  <td className="p-2">{m.expires_at ? new Date(m.expires_at).toLocaleDateString() : "—"}</td>
                  <td className="p-2 text-right">
                    <Link href={`/c/${slug}/admin/members/${m.id}`} className="text-brand-600 hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(members ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  No members match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
