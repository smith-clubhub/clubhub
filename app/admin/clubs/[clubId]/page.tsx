import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select-native";
import { setClubStatusAction, setClubPackageTierAction, geocodeClubAction } from "./actions";

export default async function PlatformClubDetailPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const supabase = await createClient();

  const [{ data: club }, { data: tiers }] = await Promise.all([
    supabase.from("clubs").select("*").eq("id", clubId).maybeSingle(),
    supabase.from("club_package_tiers").select("*").order("sort_order"),
  ]);

  if (!club) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{club.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-muted-foreground">Slug</div>
              <div>/{club.slug}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Address</div>
              <div>{club.address ?? "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Coordinates</div>
              <div>
                {club.latitude != null && club.longitude != null
                  ? `${club.latitude}, ${club.longitude}`
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Geocode status</div>
              <Badge variant={club.geocode_status === "ok" ? "default" : "secondary"}>
                {club.geocode_status}
              </Badge>
            </div>
          </div>
          <form action={geocodeClubAction}>
            <input type="hidden" name="clubId" value={club.id} />
            <Button type="submit" size="sm" variant="outline">
              Re-geocode address
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={setClubStatusAction} className="flex items-end gap-2">
            <input type="hidden" name="clubId" value={club.id} />
            <Select name="status" defaultValue={club.status} className="max-w-48">
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
            </Select>
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Package tier</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={setClubPackageTierAction} className="flex items-end gap-2">
            <input type="hidden" name="clubId" value={club.id} />
            <Select name="packageTierId" defaultValue={club.package_tier_id} className="max-w-48">
              {(tiers ?? []).map((tier) => (
                <SelectItem key={tier.id} value={tier.id}>
                  {tier.name}
                </SelectItem>
              ))}
            </Select>
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
