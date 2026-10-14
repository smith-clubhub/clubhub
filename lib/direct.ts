import { createClient } from "@/lib/supabase/server";
import type { Message, PostFeedItem, ProfilePublic } from "@/lib/types";

type ClubRef = { id: string; name: string; slug: string; logo_url: string | null };

export interface ThreadSummary {
  id: string;
  title: string;
  avatarUrl: string | null;
  isClub: boolean;
  lastMessageAt: string;
  preview: string;
  unread: boolean;
}

/** Display info for the "other side" of a thread, from the given viewpoint. */
export interface ThreadPeer {
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  href: string | null;
  isClub: boolean;
}

function previewOf(m: Pick<Message, "body" | "shared_post_id" | "shared_event_id" | "shared_club_id"> | undefined) {
  if (!m) return "Say hi 👋";
  if (m.body) return m.body;
  if (m.shared_post_id) return "Shared a post";
  if (m.shared_event_id) return "Shared an event";
  if (m.shared_club_id) return "Shared a club";
  return "";
}

/** Clubs where the viewer can answer the club's DMs (messages.reply). */
export async function getClubInboxes(userId: string): Promise<ClubRef[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_role_assignments")
    .select("clubs(id, name, slug, logo_url)")
    .eq("user_id", userId)
    .not("club_id", "is", null);
  const clubs = new Map<string, ClubRef>();
  for (const row of data ?? []) {
    const c = row.clubs as unknown as ClubRef | null;
    if (c) clubs.set(c.id, c);
  }
  const allowed: ClubRef[] = [];
  for (const c of clubs.values()) {
    const { data: ok } = await supabase.rpc("has_club_permission", { uid: userId, cid: c.id, perm_key: "messages.reply" });
    if (ok) allowed.push(c);
  }
  return allowed;
}

/**
 * The viewer's personal inbox (inboxClubId = null), or a club's inbox when the
 * viewer is staff for that club.
 */
export async function getThreads(userId: string, inboxClubId: string | null): Promise<ThreadSummary[]> {
  const supabase = await createClient();

  let convQuery = supabase
    .from("conversations")
    .select("id, club_id, last_message_at, clubs(id, name, slug, logo_url), conversation_members(user_id, last_read_at)")
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (inboxClubId) {
    convQuery = convQuery.eq("club_id", inboxClubId);
  } else {
    const { data: mine } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", userId);
    const ids = (mine ?? []).map((m) => m.conversation_id as string);
    if (ids.length === 0) return [];
    convQuery = convQuery.in("id", ids);
  }

  const { data: convs } = await convQuery;
  if (!convs || convs.length === 0) return [];

  const otherUserIds = new Set<string>();
  for (const c of convs) {
    for (const m of (c.conversation_members ?? []) as { user_id: string }[]) {
      if (m.user_id !== userId) otherUserIds.add(m.user_id);
    }
  }

  const [{ data: profiles }, lastMessages] = await Promise.all([
    otherUserIds.size
      ? supabase.from("profiles_public").select("*").in("id", [...otherUserIds])
      : Promise.resolve({ data: [] as ProfilePublic[] }),
    Promise.all(
      convs.map((c) =>
        supabase
          .from("messages")
          .select("body, shared_post_id, shared_event_id, shared_club_id, sender_id, as_club")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then((r) => r.data),
      ),
    ),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p as ProfilePublic]));

  return convs.map((c, i) => {
    const members = (c.conversation_members ?? []) as { user_id: string; last_read_at: string }[];
    const me = members.find((m) => m.user_id === userId);
    const club = c.clubs as unknown as ClubRef | null;
    let title: string;
    let avatarUrl: string | null;
    let isClub = false;

    if (club && !inboxClubId) {
      title = club.name;
      avatarUrl = club.logo_url;
      isClub = true;
    } else {
      const other = profileById.get(members.find((m) => m.user_id !== userId)?.user_id ?? "");
      title = other?.username ?? "ClubHub user";
      avatarUrl = other?.avatar_url ?? null;
    }

    const last = lastMessages[i] as (Message & { sender_id: string }) | null;
    const fromMe = last && (inboxClubId ? last.as_club : last.sender_id === userId && !last.as_club);
    const lastRead = me?.last_read_at ?? null;
    return {
      id: c.id,
      title,
      avatarUrl,
      isClub,
      lastMessageAt: c.last_message_at,
      preview: `${fromMe ? "You: " : ""}${previewOf(last ?? undefined)}`,
      // Club inboxes have no per-staff read marker; only personal threads show unread.
      unread: !inboxClubId && !!last && !fromMe && (!lastRead || new Date(c.last_message_at) > new Date(lastRead)),
    };
  });
}

export interface ThreadData {
  conversationId: string;
  clubId: string | null;
  /** True when the viewer is answering as the club (staff, not a participant). */
  actingAsClub: boolean;
  peer: ThreadPeer;
  messages: Message[];
  sharedPosts: Record<string, PostFeedItem>;
  sharedEvents: Record<string, { id: string; title: string; start_at: string; club_slug: string; club_name: string; cover_image_url: string | null }>;
  sharedClubs: Record<string, ClubRef>;
  profiles: Record<string, ProfilePublic>;
}

export async function getThread(userId: string, conversationId: string): Promise<ThreadData | null> {
  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, club_id, clubs(id, name, slug, logo_url), conversation_members(user_id)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return null;

  const memberIds = ((conv.conversation_members ?? []) as { user_id: string }[]).map((m) => m.user_id);
  const isParticipant = memberIds.includes(userId);
  const club = conv.clubs as unknown as ClubRef | null;
  const actingAsClub = !!club && !isParticipant;

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(300);
  const msgs = (messages ?? []) as Message[];

  const postIds = [...new Set(msgs.map((m) => m.shared_post_id).filter(Boolean))] as string[];
  const eventIds = [...new Set(msgs.map((m) => m.shared_event_id).filter(Boolean))] as string[];
  const clubIds = [...new Set(msgs.map((m) => m.shared_club_id).filter(Boolean))] as string[];

  const [{ data: posts }, { data: events }, { data: clubs }, { data: profiles }] = await Promise.all([
    postIds.length ? supabase.from("posts_feed").select("*").in("id", postIds) : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase.from("events_public").select("id, title, start_at, club_slug, club_name, cover_image_url").in("id", eventIds)
      : Promise.resolve({ data: [] }),
    clubIds.length
      ? supabase.from("clubs").select("id, name, slug, logo_url").in("id", clubIds)
      : Promise.resolve({ data: [] }),
    supabase.from("profiles_public").select("*").in("id", memberIds),
  ]);

  const profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p as ProfilePublic]));
  const otherUser = memberIds.find((id) => id !== userId);

  let peer: ThreadPeer;
  if (club && !actingAsClub) {
    peer = { title: club.name, subtitle: club.slug, avatarUrl: club.logo_url, href: `/c/${club.slug}`, isClub: true };
  } else {
    const p = otherUser ? profileById[otherUser] : undefined;
    const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(" ");
    peer = {
      title: p?.username ?? "ClubHub user",
      subtitle: actingAsClub ? `Messaging ${club!.name}` : fullName || null,
      avatarUrl: p?.avatar_url ?? null,
      href: null,
      isClub: false,
    };
  }

  return {
    conversationId,
    clubId: conv.club_id,
    actingAsClub,
    peer,
    messages: msgs,
    sharedPosts: Object.fromEntries((posts ?? []).map((p) => [p.id, p as PostFeedItem])),
    sharedEvents: Object.fromEntries((events ?? []).map((e) => [e.id, e])),
    sharedClubs: Object.fromEntries((clubs ?? []).map((c) => [c.id, c as ClubRef])),
    profiles: profileById,
  };
}
