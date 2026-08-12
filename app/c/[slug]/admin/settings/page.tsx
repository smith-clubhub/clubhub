import { getClubContext, can } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { getClubMediaUsage } from "@/lib/media";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaUploadForm } from "@/components/media-upload-form";
import { MediaGallery } from "@/components/media-gallery";
import { ClubSettingsForm } from "./club-settings-form";
import { RoleAssignmentForm } from "./role-assignment-form";
import { removeRoleAction } from "./actions";
import type { ClubMediaAsset } from "@/lib/types";

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

  const canManageSettings = can(ctx, "club.settings");
  let mediaUsage = null;
  let galleryAssets: ClubMediaAsset[] = [];
  if (canManageSettings) {
    const [usage, { data: assets }] = await Promise.all([
      getClubMediaUsage(ctx.club.id),
      supabase
        .from("club_media_assets")
        .select("*")
        .eq("club_id", ctx.club.id)
        .in("kind", ["gallery_photo", "gallery_video"])
        .order("created_at", { ascending: false }),
    ]);
    mediaUsage = usage;
    galleryAssets = assets ?? [];
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {canManageSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Club settings</CardTitle>
          </CardHeader>
          <CardContent>
            <ClubSettingsForm club={ctx.club} />
          </CardContent>
        </Card>
      )}

      {canManageSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <MediaUploadForm
              clubId={ctx.club.id}
              slug={slug}
              kind="logo"
              label="Logo"
              accept="image/png,image/jpeg,image/webp"
            />
            <MediaUploadForm
              clubId={ctx.club.id}
              slug={slug}
              kind="cover"
              label="Cover image"
              accept="image/png,image/jpeg,image/webp"
            />
          </CardContent>
        </Card>
      )}

      {canManageSettings && mediaUsage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Photo &amp; video gallery</span>
              <Badge variant="outline">{mediaUsage.tierName} package</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {mediaUsage.photoCount} / {mediaUsage.photoQuota} photos &middot; {mediaUsage.videoCount} /{" "}
              {mediaUsage.videoQuota} videos
            </p>
            <MediaUploadForm
              clubId={ctx.club.id}
              slug={slug}
              kind="gallery_photo"
              label="Add a photo"
              accept="image/png,image/jpeg,image/webp"
              disabled={mediaUsage.photoCount >= mediaUsage.photoQuota}
              disabledReason="Photo quota reached for your package. Ask ClubHub to upgrade your package for more photos."
            />
            <MediaUploadForm
              clubId={ctx.club.id}
              slug={slug}
              kind="gallery_video"
              label="Add a video"
              accept="video/mp4,video/quicktime"
              disabled={mediaUsage.videoQuota === 0 || mediaUsage.videoCount >= mediaUsage.videoQuota}
              disabledReason={
                mediaUsage.videoQuota === 0
                  ? "Video uploads are available on the Growth and Premium packages."
                  : "Video quota reached for your package. Ask ClubHub to upgrade your package for more videos."
              }
            />
            <MediaGallery clubId={ctx.club.id} slug={slug} assets={galleryAssets} />
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
