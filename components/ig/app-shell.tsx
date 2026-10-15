import { createClient } from "@/lib/supabase/server";
import { AppNav, type NavViewer } from "@/components/ig/app-nav";
import { GeolocationProvider } from "@/components/ig/geolocation-provider";

async function loadViewer(): Promise<NavViewer | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { count: unreadNotifications }, { data: threads }] = await Promise.all([
    supabase.from("profiles").select("username, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    supabase
      .from("conversation_members")
      .select("last_read_at, conversations(last_message_at)")
      .eq("user_id", userId),
  ]);

  const unreadMessages = (threads ?? []).filter((t) => {
    const conv = t.conversations as unknown as { last_message_at: string } | null;
    return conv && new Date(conv.last_message_at) > new Date(t.last_read_at);
  }).length;

  return {
    username: profile?.username ?? "me",
    avatarUrl: profile?.avatar_url ?? null,
    unreadNotifications: unreadNotifications ?? 0,
    unreadMessages,
  };
}

/** Wraps user-facing screens in Instagram-style navigation. Pages own their width. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const viewer = await loadViewer();
  return (
    <GeolocationProvider>
      <AppNav viewer={viewer} />
      <div className="md:pl-[76px] xl:pl-[248px] pb-[calc(100px+env(safe-area-inset-bottom))] md:pb-0 min-h-screen">
        {children}
      </div>
    </GeolocationProvider>
  );
}

/** Sticky in-page header used by every screen except Home (which has the wordmark bar). */
export function PageHeader({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 box-content h-12 pt-[env(safe-area-inset-top)] flex items-center justify-between gap-3 px-4 bg-background/95 backdrop-blur border-b md:border-none md:pt-6 md:h-auto md:static">
      <h1 className="font-semibold text-base md:text-xl truncate">{title}</h1>
      {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
    </header>
  );
}
