import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFollowedClubIds } from "@/lib/feed";
import { getStoryClubs } from "@/lib/stories";
import { StoryViewer } from "@/components/ig/story-viewer";

export default async function StoriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const clubs = await getStoryClubs(userId, await getFollowedClubIds(userId));
  const index = clubs.findIndex((c) => c.slug === slug);
  if (index === -1) notFound();

  const current = clubs[index]!;
  const next = clubs.slice(index + 1).find((c) => !c.allSeen) ?? null;
  const prev = index > 0 ? clubs[index - 1]! : null;

  return (
    <StoryViewer
      key={current.clubId}
      club={current}
      nextSlug={next?.slug ?? null}
      prevSlug={prev?.slug ?? null}
      isAuthenticated={!!userId}
    />
  );
}
