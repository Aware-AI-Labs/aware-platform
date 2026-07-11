import { createClient } from "@/lib/supabase/server";
import { getProfile, relativeTime } from "@/lib/data";
import { ActivityFeed } from "@/components/activity-feed";
import { ApprovalCard } from "@/components/approvals";
import { Markdown, Empty } from "@/components/ui";
import type { Activity, AiState, Approval } from "@/lib/types";

export const metadata = { title: "Mind" };

export default async function MindPage() {
  const profile = (await getProfile())!;
  const supabase = await createClient();

  const [state, awareActivity, approvals, memories, shipped] =
    await Promise.all([
      supabase.from("ai_state").select("*").eq("id", 1).maybeSingle(),
      supabase
        .from("activity")
        .select("*")
        .eq("actor_type", "aware")
        .order("id", { ascending: false })
        .limit(20),
      profile.role === "member"
        ? Promise.resolve({ data: [] })
        : supabase
            .from("approvals")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
      supabase
        .from("ai_memory")
        .select("id, kind, content, created_at")
        .order("created_at", { ascending: false })
        .limit(12),
      profile.role === "member"
        ? Promise.resolve({ data: [] })
        : supabase
            .from("approvals")
            .select("*")
            .in("status", ["executed", "failed"])
            .order("updated_at", { ascending: false })
            .limit(5),
    ]);

  const ai = state.data as AiState | null;

  return (
    <div className="space-y-12">
      <header className="rise">
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full pulse-dot"
            style={{ background: "var(--accent)" }}
          />
          <p className="eyebrow">AWARE</p>
        </div>
        <h1 className="display text-4xl sm:text-5xl mt-3">Mind.</h1>
        {ai?.last_tick && (
          <p className="text-faint text-xs mt-4">
            heartbeat {relativeTime(ai.last_tick)}
            {ai?.last_daily && ` · brief ${relativeTime(ai.last_daily)}`}
            {ai?.last_weekly && ` · review ${relativeTime(ai.last_weekly)}`}
          </p>
        )}
      </header>

      <section className="rise rise-1 max-w-2xl">
        <p className="eyebrow mb-3">Focus</p>
        {ai?.focus ? (
          <Markdown>{ai.focus}</Markdown>
        ) : (
          <Empty>—</Empty>
        )}
      </section>

      {ai?.open_questions && (
        <section className="rise rise-1 max-w-2xl">
          <p className="eyebrow mb-3">Open questions</p>
          <Markdown>{ai.open_questions}</Markdown>
        </section>
      )}

      {(approvals.data as Approval[])?.length > 0 && (
        <section className="rise rise-2">
          <p className="eyebrow mb-3">Proposals</p>
          <div className="space-y-2">
            {(approvals.data as Approval[]).map((a) => (
              <ApprovalCard
                key={a.id}
                approval={a}
                canDecide={profile.role === "founder"}
              />
            ))}
          </div>
        </section>
      )}

      {(shipped.data as Approval[])?.length > 0 && (
        <section className="rise rise-2">
          <p className="eyebrow mb-3">Recently shipped</p>
          <ul className="space-y-1.5">
            {(shipped.data as Approval[]).map((a) => (
              <li key={a.id} className="text-sm flex items-baseline gap-2">
                <span
                  className="text-xs"
                  style={{
                    color: a.status === "executed" ? "var(--ok)" : "var(--danger)",
                  }}
                >
                  {a.status}
                </span>
                <span className="truncate">{a.title}</span>
                {a.result && (
                  <span className="text-xs text-faint truncate">{a.result}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rise rise-3">
        <p className="eyebrow mb-2">Reasoning</p>
        <ActivityFeed items={(awareActivity.data as Activity[]) ?? []} />
      </section>

      <section className="rise rise-4">
        <p className="eyebrow mb-3">Memory</p>
        {memories.data?.length ? (
          <ul className="space-y-2">
            {memories.data.map((m) => (
              <li key={m.id} className="text-sm flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-wider text-faint shrink-0 w-16">
                  {m.kind}
                </span>
                <span className="text-muted leading-relaxed">{m.content}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Forms as it works.</Empty>
        )}
      </section>
    </div>
  );
}
