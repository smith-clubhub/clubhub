import { createClient } from "@/lib/supabase/server";

export interface ClubMediaUsage {
  tierName: string;
  photoQuota: number;
  videoQuota: number;
  photoCount: number;
  videoCount: number;
}

export async function getClubMediaUsage(clubId: string): Promise<ClubMediaUsage> {
  const supabase = await createClient();

  const [{ data: club }, { count: photoCount }, { count: videoCount }] = await Promise.all([
    supabase
      .from("clubs")
      .select("club_package_tiers(name, photo_quota, video_quota)")
      .eq("id", clubId)
      .single(),
    supabase
      .from("club_media_assets")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .in("kind", ["gallery_photo", "post_photo"]),
    supabase
      .from("club_media_assets")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .in("kind", ["gallery_video", "post_video"]),
  ]);

  const tier = club?.club_package_tiers as unknown as {
    name: string;
    photo_quota: number;
    video_quota: number;
  } | null;

  return {
    tierName: tier?.name ?? "Starter",
    photoQuota: tier?.photo_quota ?? 0,
    videoQuota: tier?.video_quota ?? 0,
    photoCount: photoCount ?? 0,
    videoCount: videoCount ?? 0,
  };
}

