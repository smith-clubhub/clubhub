import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type OwnerProfile = { first_name: string | null; last_name: string | null; email: string | null };

export default async function PlatformClubsPage() {
  const supabase = await createClient();

  const [{ data: clubs }, { data: owners }] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, name, slug, status, created_at, club_package_tiers(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_role_assignments")
      .select("club_id, profiles(first_name, last_name, email), roles!inner(name)")
      .eq("roles.name", "Owner"),
  ]);

  const ownerByClub = new Map<string, OwnerProfile>();
  for (const row of owners ?? []) {
    const profile = row.profiles as unknown as OwnerProfile | null;
    if (row.club_id && profile) ownerByClub.set(row.club_id, profile);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Club</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Package</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(clubs ?? []).map((club) => {
          const tier = (club.club_package_tiers as unknown as { name: string } | null)?.name;
          const owner = ownerByClub.get(club.id);
          const ownerName = [owner?.first_name, owner?.last_name].filter(Boolean).join(" ") || owner?.email;
          return (
            <TableRow key={club.id}>
              <TableCell>
                <Link href={`/admin/clubs/${club.id}`} className="font-medium hover:underline">
                  {club.name}
                </Link>
                <div className="text-xs text-muted-foreground">/{club.slug}</div>
              </TableCell>
              <TableCell>
                <Badge variant={club.status === "active" ? "default" : "secondary"}>{club.status}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{tier ?? "—"}</Badge>
              </TableCell>
              <TableCell>{ownerName ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(club.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          );
        })}
        {(clubs ?? []).length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No clubs yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
