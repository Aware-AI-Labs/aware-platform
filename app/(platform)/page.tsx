import { createClient } from "@/lib/supabase/server";
import { getProfile, entityPath } from "@/lib/data";
import { ApprovalCard } from "@/components/approvals";
import { AlertRow } from "@/components/alerts";
import { Status, Row, Card, Orb, Sparkline, ProgressHair } from "@/components/ui";
import { VitalsBand } from "@/components/vitals-band";
import { LivePulse } from "@/components/live-pulse";
import { BriefReader } from "@/components/brief-reader";
import type { Activity, Alert, Approval, Workstream } from "@/lib/types";

export default async function Home() {
  const profile = (await getProfile())!;
  const supabase = await createClient();

  const [brief, workstreams, alerts, approvals, activity, taskCount, commitments] =
    await Promise.all([
      supabase
        .from("docs")
        .select("id, title, body, created_at")
        .eq("kind", "brief")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workstreams")
        .select("*")
        .in("status", ["active", "planned"])
        .order("priority")
        .limit(12),
      supabase
        .from("alerts")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(4),
      profile.role === "member"
        ? Promise.resolve({ data: [] })
        : supabase
            .from("approvals")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(6),
      supabase
        .from("activity")
        .select("*")
        .order("id", { ascending: false })
        .limit(10),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .in("status", ["todo", "doing", "blocked"]),
      profile.role === "member"
        ? Promise.resolve({ data: [] })
        : supabase
            .from("finance_items")
            .select("amount")
            .eq("kind", "commitment")
            .eq("status", "active"),
    ]);

  const raw = ((brief.data?.body ?? "") as string)
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l && !l.startsWith("#"));
  const headline = raw[0]?.replace(/\*\*/g, "") ?? "";
  const rest = brief.data
    ? brief.data.body.slice(brief.data.body.indexOf(raw[0]) + raw[0].length)
    : "";

  const all = (workstreams.data as Workstream[]) ?? [];
  const flagships = all.filter((w) => w.priority === 0).slice(0, 3);
  const others = all.filter((w) => !flagships.includes(w));
  const pending = (approvals.data as Approval[]) ?? [];
  const openAlerts = (alerts.data as Alert[]) ?? [];
  const committed = ((commitments.data as Array<{ amount: number }>) ?? []).reduce(
    (s, c) => s + Number(c.amount),
    0
  );

  // Activity sparklines for flagships: last 14 days, per workstream
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const { data: flagActs } = flagships.length
    ? await supabase
        .from("activity")
        .select("target_id, created_at")
        .eq("target_type", "workstreams")
        .in("target_id", flagships.map((f) => f.id))
        .gt("created_at", since)
    : { data: [] };
  const sparkFor = (id: string) => {
    const days = new Array(14).fill(0);
    for (const a of flagActs ?? []) {
      if (a.target_id !== id) continue;
      const daysAgo = (Date.now() - new Date(a.created_at).getTime()) / 864e5;
      days[13 - Math.min(13, Math.floor(daysAgo))] += 1;
    }
    return days;
  };

  return (
    <div className="space-y-12">
      {/* The day, addressed by AWARE */}
      <section className="rise glow-hero">
        <div className="flex items-center gap-2.5">
          <Orb size={9} />
          <p className="eyebrow">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <h1 className="display text-4xl sm:text-6xl mt-5 max-w-3xl text-balance">
          {headline || "Quiet. AWARE is watching."}
        </h1>
        {rest && <BriefReader body={rest} />}
      </section>

      {pending.length > 0 && (
        <section className="rise rise-1">
          <p className="eyebrow mb-4">Approve</p>
          <div className="space-y-2">
            {pending.map((a) => (
              <ApprovalCard
                key={a.id}
                approval={a}
                canDecide={profile.role === "founder"}
              />
            ))}
          </div>
        </section>
      )}

      {openAlerts.length > 0 && (
        <section className="rise rise-1">
          <p className="eyebrow mb-2">Alerts</p>
          <div>
            {openAlerts.map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        </section>
      )}

      {/* Live vitals from connected services + graph counts */}
      <section className="rise rise-2">
        <VitalsBand
          extra={[
            {
              id: "tasks",
              label: "Open tasks",
              value: String(taskCount.count ?? 0),
              sub: pending.length ? `${pending.length} to approve` : "on track",
            },
          ]}
        />
      </section>

      {/* Flagships */}
      {flagships.length > 0 && (
        <section className="rise rise-3 grid sm:grid-cols-3 gap-3">
          {flagships.map((w) => (
            <Card key={w.id} href={entityPath("workstreams", w.id)}>
              <div className="flex items-center justify-between">
                <p className="eyebrow">{w.kind}</p>
                <Status status={w.status} />
              </div>
              <p className="display text-2xl mt-3 group-hover:text-muted transition-colors">
                {w.name}
              </p>
              <p className="text-xs text-muted mt-2 leading-relaxed line-clamp-2 min-h-8">
                {w.summary}
              </p>
              {w.kind === "fundraise" ? (
                <div className="mt-4">
                  <ProgressHair value={committed} max={75_000_000} />
                  <p className="text-[11px] text-faint mt-2 tabular-nums">
                    ${Math.round(committed / 1e6)}M of $75M
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <Sparkline points={sparkFor(w.id)} width={120} height={18} />
                </div>
              )}
            </Card>
          ))}
        </section>
      )}

      {/* The rest of the portfolio */}
      {others.length > 0 && (
        <section className="rise rise-3">
          <div>
            {others.map((w) => (
              <Row key={w.id} href={entityPath("workstreams", w.id)}>
                <span className="text-xs text-faint w-16 shrink-0 uppercase tracking-wider">
                  {w.kind}
                </span>
                <span className="text-sm font-medium truncate">{w.name}</span>
                <span className="ml-auto shrink-0">
                  <Status status={w.status} />
                </span>
              </Row>
            ))}
          </div>
        </section>
      )}

      {/* Alive */}
      <section className="rise rise-4">
        <p className="eyebrow mb-2">Pulse</p>
        <LivePulse initial={(activity.data as Activity[]) ?? []} />
      </section>
    </div>
  );
}
