import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPostViewerState } from "@/lib/feed";
import { PageHeader } from "@/components/ig/app-shell";
import { PostCard } from "@/components/ig/post-card";
import { CommentComposer, CommentRow } from "@/components/ig/comments";
import type { PostComment, PostFeedItem, ProfilePublic } from "@/lib/types";

export default async function PostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data: post } = await supabase.from("posts_feed").select("*").eq("id", postId).maybeSingle();
  if (!post) notFound();

  const [{ data: comments }, viewerState, { data: canModerate }] = await Promise.all([
    supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at").limit(500),
    getPostViewerState(userId, [postId]),
    userId
      ? supabase.rpc("has_club_permission", { uid: userId, cid: post.club_id, perm_key: "posts.create" })
      : Promise.resolve({ data: false }),
  ]);

  const authorIds = [...new Set((comments ?? []).map((c) => c.user_id as string))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles_public").select("*").in("id", authorIds)
    : { data: [] };
  const authorById = new Map((authors ?? []).map((a) => [a.id as string, a as ProfilePublic]));

  return (
    <main className="mx-auto w-full max-w-[470px]">
      <PageHeader title="Post" />
      <div className="md:pt-4">
        <PostCard
          post={post as PostFeedItem}
          viewer={viewerState[postId]!}
          isAuthenticated={!!userId}
          showAllCaption
        />
      </div>

      <section className="px-3 pb-24 md:pb-8">
        <h2 className="sr-only">Comments</h2>
        {(comments ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
        ) : (
          <ul className="flex flex-col gap-4 py-4">
            {(comments as PostComment[]).map((c) => (
              <CommentRow
                key={c.id}
                comment={c}
                author={authorById.get(c.user_id) ?? null}
                canDelete={c.user_id === userId || canModerate === true}
              />
            ))}
          </ul>
        )}
        {userId ? (
          <CommentComposer postId={postId} />
        ) : (
          <p className="py-4 text-center text-sm">
            <Link href={`/auth/login?next=/p/${postId}`} className="font-semibold text-primary">
              Log in
            </Link>{" "}
            to comment.
          </p>
        )}
      </section>
    </main>
  );
}
