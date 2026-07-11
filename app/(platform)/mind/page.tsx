import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, relativeTime, entityPath } from "@/lib/data";
import { ApprovalCard } from "@/components/approvals";
import { Markdown, Orb, Chip } from "@/components/ui";
import { VitalsBand } from "@/components/vitals-band";
import type { Activity, AiState, Approval } from "@/lib/types";

export const metadata = { title: "Mind" };

const MEMORY_TINT: Record<string, string> = {
  fact: "var(--muted)",
  insight: "var(--accent)",
  preference: "var(--ok)",
  context: "var(--warn)",
};

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
        .limit(16),
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
  const focusText = (ai?.focus ?? "").replace(/[#*_`]/g, "");
  const focusLead = focusText.split(/(?<=\.)\s/)[0] ?? "";
  const focusRest = focusText.slice(focusLead.length).trim();

  return (
    <div className="space-y-14">
      <header className="rise glow-hero">
        <div className="flex items-center gap-3">
          <Orb size={16} />
          <p className="eyebrow">AWARE</p>
          {ai?.last_tick && (
            <p className="text-[11px] text-faint ml-auto">
              heartbeat {relativeTime(ai.last_tick)}
              {ai?.last_daily && ` · brief ${relativeTime(ai.last_daily)}`}
            </p>
          )}
        </div>
        <h1 className="display text-3xl sm:text-5xl mt-6 max-w-3xl text-balance">
          {focusLead || "Coming online."}
        </h1>
        {focusRest && (
          <p className="text-muted text-sm mt-4 max-w-2xl leading-relaxed">
            {focusRest}
          </p>
        )}
      </header>

      {ai?.open_questions && (
        <section className="rise rise-1 max-w-2xl">
          <p className="eyebrow mb-3">Asking itself</p>
          <Markdown>{ai.open_questions.replace(/\\n/g, "\n")}</Markdown>
        </section>
      )}

      <section className="rise rise-1">
        <VitalsBand />
      </section>

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
          <p className="eyebrow mb-3">Shipped</p>
          <ul className="space-y-1.5">
            {(shipped.data as Approval[]).map((a) => (
              <li key={a.id} className="text-sm flex items-baseline gap-2">
                <span
                  aria-hidden
                  className="size-1 rounded-full dot-glow shrink-0 self-center"
                  style={{
                    color: a.status === "executed" ? "var(--ok)" : "var(--danger)",
                    background: "currentcolor",
                  }}
                />
                <span className="truncate">{a.title}</span>
                {a.result && (
                  <span className="text-xs text-faint truncate">{a.result}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reasoning timeline */}
      <section className="rise rise-3">
        <p className="eyebrow mb-4">Reasoning</p>
        <ol className="relative border-l border-line ml-1">
          {((awareActivity.data as Activity[]) ?? []).map((a) => (
            <li key={a.id} className="pl-5 pb-6 last:pb-0 relative">
              <span
                aria-hidden
                className="absolute -left-[3px] top-1.5 size-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              <div className="flex items-baseline gap-2">
                <p className="text-sm">
                  {a.verb}
                  {a.target_label && (
                    <>
                      {" "}
                      {a.target_id ? (
                        <Link
                          href={entityPath(a.target_type, a.target_id)}
                          className="hover:underline underline-offset-2 font-medium"
                        >
                          {a.target_label}
                        </Link>
                      ) : (
                        <span className="font-medium">{a.target_label}</span>
                      )}
                    </>
                  )}
                </p>
                <span className="text-[11px] text-faint shrink-0 ml-auto">
                  {relativeTime(a.created_at)}
                </span>
              </div>
              {a.detail && (
                <p className="text-xs text-muted mt-1.5 leading-relaxed line-clamp-3 max-w-xl">
                  {a.detail}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Memory chips */}
      <section className="rise rise-4">
        <p className="eyebrow mb-3">Memory</p>
        {memories.data?.length ? (
          <div className="flex flex-wrap gap-2">
            {memories.data.map((m) => (
              <Chip key={m.id} tint={MEMORY_TINT[m.kind]}>
                <span className="max-w-72 truncate">{m.content}</span>
              </Chip>
            ))}
          </div>
        ) : (
          <p className="text-faint text-sm">Forms as it works.</p>
        )}
      </section>
    </div>
  );
}
