import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";

/**
 * GitHub org webhook — signature-verified. Commits, PRs, and new repos flow
 * into the activity stream and auto-link to workstreams by repo name.
 */
export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected =
    "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const valid =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event") ?? "";
  const payload = JSON.parse(raw);
  const admin = createAdminClient();

  const repoFull: string = payload.repository?.full_name ?? "";
  const repoName: string = payload.repository?.name ?? "";

  // Auto-link: workstream whose repo matches, or whose name loosely matches.
  let workstreamId: string | null = null;
  if (repoFull) {
    const { data: byRepo } = await admin
      .from("workstreams")
      .select("id")
      .eq("repo", repoFull)
      .maybeSingle();
    workstreamId = byRepo?.id ?? null;
    if (!workstreamId && repoName) {
      const { data: byName } = await admin
        .from("workstreams")
        .select("id, name")
        .ilike("name", `%${repoName.replace(/-/g, "%")}%`)
        .limit(1)
        .maybeSingle();
      workstreamId = byName?.id ?? null;
    }
  }

  if (event === "push") {
    const commits = (payload.commits ?? []) as Array<{
      message: string;
      author: { name: string };
    }>;
    if (commits.length) {
      const branch = String(payload.ref ?? "").replace("refs/heads/", "");
      await logActivity(admin, {
        actor_type: "system",
        actor_name: payload.pusher?.name ?? "GitHub",
        verb: `pushed ${commits.length} commit${commits.length > 1 ? "s" : ""} to ${repoName}/${branch}`,
        target_type: workstreamId ? "workstreams" : "",
        target_id: workstreamId,
        target_label: commits[0].message.split("\n")[0].slice(0, 120),
        meta: { repo: repoFull, event },
      });
    }
  } else if (event === "pull_request") {
    const action = payload.action;
    const pr = payload.pull_request;
    if (["opened", "closed", "reopened"].includes(action) && pr) {
      const verb =
        action === "closed" && pr.merged
          ? `merged PR #${pr.number} in ${repoName}`
          : `${action} PR #${pr.number} in ${repoName}`;
      await logActivity(admin, {
        actor_type: "system",
        actor_name: pr.user?.login ?? "GitHub",
        verb,
        target_type: workstreamId ? "workstreams" : "",
        target_id: workstreamId,
        target_label: String(pr.title ?? "").slice(0, 120),
        detail: pr.html_url ?? "",
        meta: { repo: repoFull, event },
      });
    }
  } else if (event === "repository" && payload.action === "created") {
    await logActivity(admin, {
      actor_type: "system",
      actor_name: payload.sender?.login ?? "GitHub",
      verb: "created repository",
      target_label: repoFull,
      detail: payload.repository?.description ?? "",
      meta: { repo: repoFull, event },
    });
  }

  return NextResponse.json({ ok: true });
}
