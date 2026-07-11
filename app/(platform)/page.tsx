import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, entityPath, relativeTime } from "@/lib/data";
import { ActivityFeed } from "@/components/activity-feed";
import { ApprovalCard } from "@/components/approvals";
import { AlertRow } from "@/components/alerts";
import { Markdown, Status, Row } from "@/components/ui";
import type { Activity, Alert, Approval, Workstream } from "@/lib/types";

export default async function Home() {
  const profile = (await getProfile())!;
  const supabase = await createClient();
  const firstName = (profile.name || profile.email).split(/[\s@]/)[0];

  const [brief, workstreams, alerts, approvals, activity, myTasks] =
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
        .limit(5),
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
        .select("id, title, status, priority")
        .in("status", ["todo", "doing", "blocked"])
        .order("priority")
        .limit(6),
    ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  return (
    <div className="space-y-12">
      {/* The brief — editorial, not a widget */}
      <section className="rise">
        <p className="eyebrow">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="display text-4xl sm:text-5xl mt-3">
          {greeting}, {firstName}.
        </h1>
        {brief.data ? (
          <div className="mt-6 max-w-2xl">
            <Markdown>{brief.data.body}</Markdown>
            <p className="text-xs text-faint mt-3">
              — AWARE,{" "}
              {relativeTime(brief.data.created_at) === "now"
                ? "just now"
                : `${relativeTime(brief.data.created_at)} ago`}
            </p>
          </div>
        ) : (
          <p className="text-muted mt-5 max-w-xl text-sm leading-relaxed">
            No morning brief yet — AWARE writes one every day once its
            heartbeat is running. Ask it anything meanwhile.
          </p>
        )}
      </section>

      {/* Approvals waiting on the founder */}
      {(approvals.data as Approval[])?.length > 0 && (
        <section className="rise rise-1">
          <p className="eyebrow mb-4">
            Waiting on you · {(approvals.data as Approval[]).length}
          </p>
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

      {/* Alerts & risks */}
      {(alerts.data as Alert[])?.length > 0 && (
        <section className="rise rise-1">
          <p className="eyebrow mb-2">Alerts</p>
          <div>
            {(alerts.data as Alert[]).map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        </section>
      )}

      {/* What matters */}
      <section className="rise rise-2">
        <div className="flex items-baseline justify-between mb-3">
          <p className="eyebrow">What matters now</p>
          <Link href="/work" className="text-xs text-faint hover:text-fg transition-colors">
            all work →
          </Link>
        </div>
        <div>
          {(workstreams.data as Workstream[])?.map((w) => (
            <Row key={w.id} href={entityPath("workstreams", w.id)}>
              <span className="text-xs text-faint w-16 shrink-0 uppercase tracking-wider">
                {w.kind}
              </span>
              <span className="text-sm font-medium truncate">{w.name}</span>
              <span className="text-xs text-faint truncate hidden sm:block">
                {w.summary}
              </span>
              <span className="ml-auto shrink-0">
                <Status status={w.status} />
              </span>
            </Row>
          ))}
        </div>
      </section>

      {/* Open tasks */}
      {(myTasks.data ?? []).length > 0 && (
        <section className="rise rise-3">
          <p className="eyebrow mb-3">Open tasks</p>
          <div>
            {(myTasks.data ?? []).map((t) => (
              <Row key={t.id} href={entityPath("tasks", t.id)}>
                <span className="text-xs text-faint w-6 shrink-0">
                  p{t.priority}
                </span>
                <span className="text-sm truncate">{t.title}</span>
                <span className="ml-auto shrink-0">
                  <Status status={t.status} />
                </span>
              </Row>
            ))}
          </div>
        </section>
      )}

      {/* The pulse */}
      <section className="rise rise-4">
        <p className="eyebrow mb-2">Activity</p>
        <ActivityFeed items={(activity.data as Activity[]) ?? []} />
      </section>
    </div>
  );
}
