import { Button } from "@/components/ui/button";
import { deleteMediaAssetAction } from "@/app/c/[slug]/admin/settings/media-actions";
import type { ClubMediaAsset } from "@/lib/types";

export function MediaGallery({
  clubId,
  slug,
  assets,
}: {
  clubId: string;
  slug: string;
  assets: ClubMediaAsset[];
}) {
  if (assets.length === 0) {
    return <p className="text-sm text-muted-foreground">No gallery photos or videos yet.</p>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {assets.map((asset) => (
        <div key={asset.id} className="relative group aspect-square rounded-md overflow-hidden border">
          {asset.kind === "gallery_video" ? (
            <video src={asset.url} className="w-full h-full object-cover" muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt="" className="w-full h-full object-cover" />
          )}
          <form
            action={deleteMediaAssetAction}
            className="absolute inset-0 flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"
          >
            <input type="hidden" name="clubId" value={clubId} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="assetId" value={asset.id} />
            <Button type="submit" size="sm" variant="destructive">
              Delete
            </Button>
          </form>
        </div>
      ))}
    </div>
  );
}
