import type { SupabaseClient } from "@supabase/supabase-js";
import { githubEnabled, listRecentCommits } from "@/lib/github";

/**
 * Signal pulls for AWARE's heartbeat. Each integration lights up when its key
 * exists and fails soft — a missing or broken service never stops the pulse.
 */

async function safe(label: string, fn: () => Promise<string>): Promise<string> {
  try {
    const result = await fn();
    return result ? `## ${label}\n${result}` : "";
  } catch (err) {
    return `## ${label}\n(unavailable: ${err instanceof Error ? err.message.slice(0, 120) : "error"})`;
  }
}

async function stripeSignal(): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return "";
  return safe("Stripe (Aware Use revenue)", async () => {
    const res = await fetch("https://api.stripe.com/v1/charges?limit=10", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const charges = (data.data ?? []) as Array<{
      amount: number;
      currency: string;
      status: string;
      created: number;
    }>;
    if (!charges.length) return "No recent charges.";
    const total = charges
      .filter((c) => c.status === "succeeded")
      .reduce((s, c) => s + c.amount, 0);
    return `Last ${charges.length} charges: ${(total / 100).toFixed(2)} ${charges[0]?.currency?.toUpperCase() ?? "USD"} total. Most recent: ${new Date(charges[0].created * 1000).toISOString().slice(0, 10)}.`;
  });
}

async function sentrySignal(): Promise<string> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  if (!token || !org) return "";
  return safe("Sentry (errors)", async () => {
    const res = await fetch(
      `https://sentry.io/api/0/organizations/${org}/issues/?statsPeriod=24h&query=is:unresolved&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const issues = (await res.json()) as Array<{ title: string; count: string; project: { slug: string } }>;
    if (!issues.length) return "No unresolved issues in the last 24h.";
    return issues
      .map((i) => `- [${i.project?.slug}] ${i.title} (${i.count} events)`)
      .join("\n");
  });
}

async function posthogSignal(): Promise<string> {
  const key = process.env.POSTHOG_API_KEY;
  const project = process.env.POSTHOG_PROJECT_ID;
  if (!key || !project) return "";
  return safe("PostHog (usage)", async () => {
    const res = await fetch(
      `https://us.posthog.com/api/projects/${project}/query/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query:
              "select count() as events, count(distinct person_id) as users from events where timestamp > now() - interval 1 day",
          },
        }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const row = data.results?.[0];
    return row ? `Last 24h: ${row[0]} events from ${row[1]} users.` : "No data.";
  });
}

async function runpodSignal(): Promise<string> {
  const key = process.env.RUNPOD_API_KEY;
  if (!key) return "";
  return safe("RunPod (compute)", async () => {
    const res = await fetch("https://rest.runpod.io/v1/pods", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pods = (await res.json()) as Array<{
      name: string;
      desiredStatus: string;
      costPerHr?: number;
    }>;
    if (!Array.isArray(pods) || !pods.length) return "No pods running.";
    return pods
      .map((p) => `- ${p.name}: ${p.desiredStatus}${p.costPerHr ? ` ($${p.costPerHr}/hr)` : ""}`)
      .join("\n");
  });
}

async function githubSignal(): Promise<string> {
  if (!githubEnabled()) return "";
  const repos = [
    process.env.GITHUB_WEBSITE_REPO,
    `${process.env.GITHUB_ORG ?? "Aware-AI-Labs"}/aware-platform`,
  ].filter(Boolean) as string[];
  return safe("GitHub (recent commits)", async () => {
    const parts: string[] = [];
    for (const repo of repos) {
      try {
        const commits = await listRecentCommits(repo, 3);
        if (commits.length)
          parts.push(
            `${repo}:\n` +
              commits.map((c) => `- ${c.sha} ${c.message} (${c.author})`).join("\n")
          );
      } catch {
        /* repo unavailable */
      }
    }
    return parts.join("\n") || "No recent commits visible.";
  });
}

async function graphSignal(admin: SupabaseClient, sinceIso: string): Promise<string> {
  const [activity, staleTasks, openAlerts, pendingApprovals] = await Promise.all([
    admin
      .from("activity")
      .select("actor_name, verb, target_label, created_at")
      .gt("created_at", sinceIso)
      .neq("actor_name", "AWARE")
      .order("id", { ascending: false })
      .limit(25),
    admin
      .from("tasks")
      .select("id, title, status, updated_at")
      .in("status", ["doing", "blocked"])
      .lt("updated_at", new Date(Date.now() - 7 * 864e5).toISOString())
      .limit(10),
    admin.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("approvals").select("id, title, created_at").eq("status", "pending"),
  ]);

  const parts: string[] = [];
  if (activity.data?.length) {
    parts.push(
      "Recent human/system activity:\n" +
        activity.data
          .map((a) => `- ${a.actor_name} ${a.verb} ${a.target_label}`)
          .join("\n")
    );
  } else {
    parts.push("No new human activity since last heartbeat.");
  }
  if (staleTasks.data?.length) {
    parts.push(
      "Stale tasks (in progress or blocked, untouched > 7 days):\n" +
        staleTasks.data.map((t) => `- [${t.status}] ${t.title} (id ${t.id})`).join("\n")
    );
  }
  parts.push(`Open alerts: ${openAlerts.count ?? 0}.`);
  if (pendingApprovals.data?.length) {
    parts.push(
      `Proposals still waiting on the founder (do NOT re-file these):\n` +
        pendingApprovals.data.map((a) => `- ${a.title}`).join("\n")
    );
  }
  return `## Company graph\n${parts.join("\n\n")}`;
}

export async function gatherSignals(
  admin: SupabaseClient,
  sinceIso: string
): Promise<string> {
  const results = await Promise.all([
    graphSignal(admin, sinceIso),
    githubSignal(),
    stripeSignal(),
    posthogSignal(),
    sentrySignal(),
    runpodSignal(),
  ]);
  return results.filter(Boolean).join("\n\n");
}
