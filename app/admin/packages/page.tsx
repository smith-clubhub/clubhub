import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageTierForm } from "./package-tier-form";

export default async function PlatformPackagesPage() {
  const supabase = await createClient();
  const { data: tiers } = await supabase.from("club_package_tiers").select("*").order("sort_order");

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {(tiers ?? []).map((tier) => (
        <Card key={tier.id}>
          <CardHeader>
            <CardTitle>{tier.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <PackageTierForm tier={tier} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
