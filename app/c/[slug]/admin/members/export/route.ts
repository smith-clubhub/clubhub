import { type NextRequest } from "next/server";
import { getClubContext } from "@/lib/club-context";
import { requireClubPermission } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

function csvEscape(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);
  await requireClubPermission(ctx.club.id, "members.export");

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const planId = searchParams.get("planId") || undefined;

  const supabase = await createClient();
  let query = supabase
    .from("members")
    .select("member_number, status, joined_at, expires_at, profiles(first_name, last_name, email), membership_plans(name)")
    .eq("club_id", ctx.club.id);

  if (status) query = query.eq("status", status);
  if (planId) query = query.eq("membership_plan_id", planId);

  const { data: members } = await query;

  const rows = [
    ["Member Number", "First Name", "Last Name", "Email", "Plan", "Status", "Joined", "Expires"],
    ...(members ?? []).map((m) => {
      const profile = m.profiles as unknown as { first_name: string | null; last_name: string | null; email: string | null } | null;
      const plan = m.membership_plans as unknown as { name: string } | null;
      return [
        m.member_number ?? "",
        profile?.first_name ?? "",
        profile?.last_name ?? "",
        profile?.email ?? "",
        plan?.name ?? "",
        m.status,
        m.joined_at ?? "",
        m.expires_at ?? "",
      ];
    }),
  ];

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${slug}-members.csv"`,
    },
  });
}
