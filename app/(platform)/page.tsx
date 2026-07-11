import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, entityPath } from "@/lib/data";
import { ActivityFeed } from "@/components/activity-feed";
import { ApprovalCard } from "@/components/approvals";
import { AlertRow } from "@/components/alerts";
import { Markdown, Status, Row } from "@/components/ui";
import type { Activity, Alert, Approval, Workstream } from "@/lib/types";
import { BriefReader } from "@/components/brief-reader";

export default async function Home() {
  const profile = (await getProfile())!;
  const supabase = await createClient();

  const [brief, workstreams, alerts, approvals, activity, taskCount] =
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
        .eq("status", "active")
        .order("priority")
        .limit(6),
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
        .limit(8),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .in("status", ["todo", "doing", "blocked"]),
    ]);

  // Headline = first meaningful line of the brief; rest reads on demand.
  const raw = ((brief.data?.body ?? "") as string)
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l && !l.startsWith("#"));
  const headline = raw[0]?.replace(/\*\*/g, "") ?? "";
  const rest = brief.data
    ? brief.data.body.slice(brief.data.body.indexOf(raw[0]) + raw[0].length)
    : "";

  const pending = (approvals.data as Approval[]) ?? [];
  const openAlerts = (alerts.data as Alert[]) ?? [];

  return (
    <div className="space-y-14">
      <section className="rise">
        <p className="eyebrow">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="display text-4xl sm:text-6xl mt-4 max-w-3xl text-balance">
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

      <section className="rise rise-2 grid grid-cols-3 gap-6 border-y border-line py-8">
        <Link href="/work" className="group">
          <p className="display text-4xl sm:text-5xl tabular-nums group-hover:text-muted transition-colors">
            {(workstreams.data ?? []).length}
          </p>
          <p className="eyebrow mt-2">Active</p>
        </Link>
        <Link href="/work" className="group">
          <p className="display text-4xl sm:text-5xl tabular-nums group-hover:text-muted transition-colors">
            {taskCount.count ?? 0}
          </p>
          <p className="eyebrow mt-2">Open tasks</p>
        </Link>
        <Link href="/mind" className="group">
          <p
            className="display text-4xl sm:text-5xl tabular-nums group-hover:opacity-80 transition-opacity"
            style={pending.length ? { color: "var(--accent)" } : undefined}
          >
            {pending.length}
          </p>
          <p className="eyebrow mt-2">Waiting on you</p>
        </Link>
      </section>

      <section className="rise rise-3">
        <div>
          {(workstreams.data as Workstream[])?.map((w) => (
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

      <section className="rise rise-4">
        <p className="eyebrow mb-2">Pulse</p>
        <ActivityFeed items={(activity.data as Activity[]) ?? []} />
      </section>
    </div>
  );
}
