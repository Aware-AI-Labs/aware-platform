import { unstable_cache } from "next/cache";

/**
 * Live company vitals from connected services. Each lights up when its key
 * exists, caches for 5 minutes, and fails soft to null — a broken service
 * never breaks a page.
 */

export interface Vital {
  id: string;
  label: string;
  value: string;
  sub: string;
  spark?: number[];
  state: "ok" | "warn" | "bad";
}

const TTL = 300;

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const stripeVital = unstable_cache(
  async (): Promise<Vital | null> => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    try {
      const since = Math.floor(Date.now() / 1000) - 30 * 86400;
      const data = await fetchJson(
        `https://api.stripe.com/v1/charges?limit=100&created[gte]=${since}`,
        { headers: { Authorization: `Bearer ${key}` } }
      );
      const charges = (data.data ?? []) as Array<{
        amount: number;
        status: string;
        created: number;
      }>;
      const ok = charges.filter((c) => c.status === "succeeded");
      const total = ok.reduce((s, c) => s + c.amount, 0) / 100;
      // 15 two-day buckets
      const buckets = new Array(15).fill(0);
      for (const c of ok) {
        const daysAgo = (Date.now() / 1000 - c.created) / 86400;
        const i = 14 - Math.min(14, Math.floor(daysAgo / 2));
        buckets[i] += c.amount / 100;
      }
      return {
        id: "revenue",
        label: "Revenue 30d",
        value: `$${Math.round(total).toLocaleString()}`,
        sub: `${ok.length} charges`,
        spark: buckets,
        state: "ok",
      };
    } catch {
      return null;
    }
  },
  ["vital-stripe"],
  { revalidate: TTL }
);

const posthogVital = unstable_cache(
  async (): Promise<Vital | null> => {
    const key = process.env.POSTHOG_API_KEY;
    const project = process.env.POSTHOG_PROJECT_ID;
    if (!key || !project) return null;
    try {
      const data = await fetchJson(
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
                "select toDate(timestamp) as d, count(distinct person_id) as u from events where timestamp > now() - interval 7 day group by d order by d",
            },
          }),
        }
      );
      const rows = (data.results ?? []) as Array<[string, number]>;
      const users = rows.reduce((s, r) => s + Number(r[1]), 0);
      return {
        id: "usage",
        label: "Users 7d",
        value: users.toLocaleString(),
        sub: "across products",
        spark: rows.map((r) => Number(r[1])),
        state: "ok",
      };
    } catch {
      return null;
    }
  },
  ["vital-posthog"],
  { revalidate: TTL }
);

const sentryVital = unstable_cache(
  async (): Promise<Vital | null> => {
    const token = process.env.SENTRY_AUTH_TOKEN;
    const org = process.env.SENTRY_ORG;
    if (!token || !org) return null;
    try {
      const issues = (await fetchJson(
        `https://sentry.io/api/0/organizations/${org}/issues/?statsPeriod=24h&query=is:unresolved&limit=25`,
        { headers: { Authorization: `Bearer ${token}` } }
      )) as unknown[];
      const n = issues.length;
      return {
        id: "errors",
        label: "Errors 24h",
        value: String(n),
        sub: n ? "unresolved" : "clean",
        state: n === 0 ? "ok" : n < 5 ? "warn" : "bad",
      };
    } catch {
      return null;
    }
  },
  ["vital-sentry"],
  { revalidate: TTL }
);

const runpodVital = unstable_cache(
  async (): Promise<Vital | null> => {
    const key = process.env.RUNPOD_API_KEY;
    if (!key) return null;
    try {
      const pods = (await fetchJson("https://rest.runpod.io/v1/pods", {
        headers: { Authorization: `Bearer ${key}` },
      })) as Array<{ desiredStatus: string; costPerHr?: number }>;
      const running = pods.filter((p) => p.desiredStatus === "RUNNING");
      const cost = running.reduce((s, p) => s + (p.costPerHr ?? 0), 0);
      return {
        id: "compute",
        label: "Compute",
        value: running.length ? `${running.length} pods` : "idle",
        sub: running.length ? `$${cost.toFixed(2)}/hr` : "RunPod",
        state: "ok",
      };
    } catch {
      return null;
    }
  },
  ["vital-runpod"],
  { revalidate: TTL }
);

const githubVital = unstable_cache(
  async (): Promise<Vital | null> => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return null;
    try {
      const repos = [
        `${process.env.GITHUB_ORG ?? "Aware-AI-Labs"}/aware-platform`,
        process.env.GITHUB_WEBSITE_REPO,
      ].filter(Boolean) as string[];
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      let commits = 0;
      const daily = new Array(7).fill(0);
      for (const repo of repos) {
        try {
          const list = (await fetchJson(
            `https://api.github.com/repos/${repo}/commits?since=${since}&per_page=100`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
              },
            }
          )) as Array<{ commit: { author: { date: string } } }>;
          commits += list.length;
          for (const c of list) {
            const daysAgo =
              (Date.now() - new Date(c.commit.author.date).getTime()) / 864e5;
            daily[6 - Math.min(6, Math.floor(daysAgo))] += 1;
          }
        } catch {
          /* repo unavailable */
        }
      }
      return {
        id: "code",
        label: "Commits 7d",
        value: String(commits),
        sub: "org-wide",
        spark: daily,
        state: "ok",
      };
    } catch {
      return null;
    }
  },
  ["vital-github"],
  { revalidate: TTL }
);

const vercelVital = unstable_cache(
  async (): Promise<Vital | null> => {
    const token = process.env.VERCEL_TOKEN;
    if (!token) return null;
    try {
      const data = await fetchJson(
        "https://api.vercel.com/v6/deployments?limit=1&target=production",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d = data.deployments?.[0];
      if (!d) return null;
      const state = String(d.state ?? "").toLowerCase();
      return {
        id: "deploy",
        label: "Deploy",
        value: state || "unknown",
        sub: "production",
        state: state === "ready" ? "ok" : state === "error" ? "bad" : "warn",
      };
    } catch {
      return null;
    }
  },
  ["vital-vercel"],
  { revalidate: TTL }
);

export async function getVitals(): Promise<Vital[]> {
  const all = await Promise.all([
    stripeVital(),
    posthogVital(),
    sentryVital(),
    runpodVital(),
    githubVital(),
    vercelVital(),
  ]);
  return all.filter(Boolean) as Vital[];
}
