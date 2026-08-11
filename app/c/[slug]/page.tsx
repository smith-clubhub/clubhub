import Link from "next/link";
import { getClubContext } from "@/lib/club-context";
import { computeEffectiveStatus, daysUntil } from "@/lib/membership";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClubTabs } from "@/components/club-tabs";

export default async function ClubHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);
  const { club, membership, staffRoles } = ctx;

  const effectiveStatus = membership ? computeEffectiveStatus(membership) : null;
  const expiryDays = membership?.expires_at ? daysUntil(membership.expires_at) : null;

  return (
    <div className="flex flex-col gap-6">
      {membership && (
        <ClubTabs
          tabs={[
            { key: "home", label: "Overview", href: `/c/${slug}` },
            { key: "events", label: "Events", href: `/c/${slug}/events` },
            { key: "card", label: "Membership Card", href: `/c/${slug}/card` },
            { key: "announcements", label: "Announcements", href: `/c/${slug}/announcements` },
          ]}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{club.name}</h1>
          {club.description && <p className="text-muted-foreground max-w-xl mt-1">{club.description}</p>}
          <Badge variant="outline" className="mt-2 capitalize">
            {club.category}
          </Badge>
        </div>
        {staffRoles.length > 0 && (
          <Button asChild variant="outline">
            <Link href={`/c/${slug}/admin`}>Manage this club</Link>
          </Button>
        )}
      </div>

      {!membership ? (
        <Card>
          <CardHeader>
            <CardTitle>Join {club.name}</CardTitle>
            <CardDescription>Pick a membership plan and complete your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/c/${slug}/join`}>Join this club</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Your membership
              <Badge>{effectiveStatus}</Badge>
            </CardTitle>
            {membership.member_number && (
              <CardDescription>Member #{membership.member_number}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {membership.status === "pending" && (
              <p className="text-sm text-muted-foreground">
                Your membership is pending. If a fee is due, complete payment to activate it.
              </p>
            )}
            {membership.expires_at && expiryDays !== null && (
              <p className="text-sm text-muted-foreground">
                {expiryDays >= 0
                  ? `Expires in ${expiryDays} day${expiryDays === 1 ? "" : "s"} (${new Date(membership.expires_at).toLocaleDateString()})`
                  : `Expired ${Math.abs(expiryDays)} day${Math.abs(expiryDays) === 1 ? "" : "s"} ago`}
              </p>
            )}
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`/c/${slug}/card`}>View membership card</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/c/${slug}/events`}>Browse events</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
