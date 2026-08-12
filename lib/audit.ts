import type { SupabaseClient } from "@supabase/supabase-js";

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    clubId: string | null;
    actorId: string;
    action: string;
    targetType: string;
    targetId?: string;
    reason?: string;
    before?: unknown;
    after?: unknown;
  },
) {
  await supabase.from("audit_log").insert({
    club_id: params.clubId,
    actor_id: params.actorId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    reason: params.reason ?? null,
    before: params.before ?? null,
    after: params.after ?? null,
  });
}
