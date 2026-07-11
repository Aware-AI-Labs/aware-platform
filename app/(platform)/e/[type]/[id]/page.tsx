import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { entityPath, relativeTime } from "@/lib/data";
import { Markdown, ProgressHair } from "@/components/ui";
import { StatusPicker, CommentForm } from "@/components/entity-controls";
import { githubEnabled, listRecentCommits } from "@/lib/github";
import type { Activity, Comment, EntityType } from "@/lib/types";

const TABLES: EntityType[] = [
  "people",
  "workstreams",
  "tasks",
  "experiments",
  "decisions",
  "docs",
  "finance_items",
];

const LABEL_FIELD: Record<string, string> = {
  people: "name",
  workstreams: "name",
  experiments: "name",
  tasks: "title",
  decisions: "title",
  docs: "title",
  finance_items: "name",
};

interface LinkedRef {
  type: string;
  id: string;
  relation: string;
  direction: "out" | "in";
  label: string;
}

async function resolveLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  id: string
): Promise<LinkedRef[]> {
  const [out, inn] = await Promise.all([
    supabase
      .from("links")
      .select("to_type, to_id, relation")
      .eq("from_type", table)
      .eq("from_id", id),
    supabase
      .from("links")
      .select("from_type, from_id, relation")
      .eq("to_type", table)
      .eq("to_id", id),
  ]);

  const refs: LinkedRef[] = [
    ...(out.data ?? []).map((l) => ({
      type: l.to_type,
      id: l.to_id,
      relation: l.relation,
      direction: "out" as const,
      label: "",
    })),
    ...(inn.data ?? []).map((l) => ({
      type: l.from_type,
      id: l.from_id,
      relation: l.relation,
      direction: "in" as const,
      label: "",
    })),
  ];

  const byType = new Map<string, string[]>();
  for (const r of refs) {
    if (!LABEL_FIELD[r.type]) continue;
    byType.set(r.type, [...(byType.get(r.type) ?? []), r.id]);
  }
  await Promise.all(
    [...byType.entries()].map(async ([type, ids]) => {
      const { data } = await supabase
        .from(type)
        .select(`id, ${LABEL_FIELD[type]}`)
        .in("id", ids);
      for (const row of (data ?? []) as unknown as Record<string, string>[]) {
        for (const r of refs) {
          if (r.type === type && r.id === row.id) r.label = row[LABEL_FIELD[type]];
        }
      }
    })
  );
  return refs.filter((r) => r.label);
}

export default async function EntityPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (!TABLES.includes(type as EntityType)) notFound();
  const table = type as EntityType;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row) notFound();

  const isFundraise = table === "workstreams" && row.kind === "fundraise";

  const [links, activity, comments, workstream, commitments] = await Promise.all([
    resolveLinks(supabase, table, id),
    supabase
      .from("activity")
      .select("*")
      .eq("target_type", table)
      .eq("target_id", id)
      .order("id", { ascending: false })
      .limit(12),
    supabase
      .from("comments")
      .select("*")
      .eq("target_type", table)
      .eq("target_id", id)
      .order("created_at"),
    row.workstream_id
      ? supabase
          .from("workstreams")
          .select("id, name")
          .eq("id", row.workstream_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    isFundraise
      ? supabase
          .from("finance_items")
          .select("amount")
          .eq("kind", "commitment")
          .eq("status", "active")
      : Promise.resolve({ data: [] }),
  ]);

  // Live commits for workstreams with a repo
  let commits: Array<{ sha: string; message: string; author?: string; date?: string }> = [];
  if (table === "workstreams" && row.repo && githubEnabled()) {
    try {
      commits = await listRecentCommits(row.repo, 3);
    } catch {
      /* quiet */
    }
  }

  const committed = ((commitments.data as Array<{ amount: number }>) ?? []).reduce(
    (s, c) => s + Number(c.amount),
    0
  );

  const title = row[LABEL_FIELD[table]] ?? "Untitled";
  const body =
    table === "decisions"
      ? [
          row.context && `## Context\n${row.context}`,
          row.options && `## Options\n${row.options}`,
          `## Choice\n${row.choice}`,
          row.rationale && `## Rationale\n${row.rationale}`,
        ]
          .filter(Boolean)
          .join("\n\n")
      : table === "experiments"
        ? [
            row.hypothesis && `## Hypothesis\n${row.hypothesis}`,
            row.dataset && `**Dataset**: ${row.dataset}`,
            row.compute && `**Compute**: ${row.compute}`,
            Object.keys(row.metrics ?? {}).length > 0 &&
              `## Metrics\n\`\`\`json\n${JSON.stringify(row.metrics, null, 2)}\n\`\`\``,
            row.result && `## Result\n${row.result}`,
            row.verdict && `## Verdict\n${row.verdict}`,
          ]
            .filter(Boolean)
            .join("\n\n")
        : (row.body ?? "");

  const meta: Array<[string, React.ReactNode]> = [];
  if (row.kind) meta.push(["kind", row.kind]);
  if (typeof row.priority === "number") meta.push(["priority", `p${row.priority}`]);
  if (row.due_date) meta.push(["due", row.due_date]);
  if (row.org) meta.push(["org", row.org]);
  if (row.email) meta.push(["email", row.email]);
  if (table === "finance_items") {
    meta.push([
      "amount",
      `${Number(row.amount).toLocaleString()} ${row.currency}${row.period !== "once" ? ` / ${row.period}` : ""}`,
    ]);
  }
  if (row.decided_by_name) meta.push(["decided by", row.decided_by_name]);
  if (row.created_by_name && table === "docs") meta.push(["by", row.created_by_name]);
  if (workstream.data) {
    meta.push([
      "in",
      <Link
        key="ws"
        href={entityPath("workstreams", workstream.data.id)}
        className="hover:text-fg transition-colors underline underline-offset-2"
      >
        {workstream.data.name}
      </Link>,
    ]);
  }
  if (row.url) {
    meta.push([
      "link",
      <a
        key="url"
        href={row.url}
        target="_blank"
        rel="noreferrer"
        className="hover:text-fg transition-colors underline underline-offset-2"
      >
        {String(row.url).replace(/^https?:\/\//, "").slice(0, 32)}
      </a>,
    ]);
  }

  return (
    <div className="space-y-10">
      <header className="rise">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="eyebrow">{table.replace("_", " ")}</p>
          {row.sensitive && (
            <span className="text-[10px] uppercase tracking-wider text-warn">
              sensitive
            </span>
          )}
        </div>
        <h1 className="display text-3xl sm:text-5xl mt-3 text-balance">{title}</h1>
        {row.summary && (
          <p className="text-muted text-sm mt-4 max-w-2xl">{row.summary}</p>
        )}
        {isFundraise && (
          <div className="mt-6 max-w-2xl">
            <ProgressHair value={committed} max={75_000_000} />
            <p className="text-[11px] text-faint mt-2 tabular-nums">
              ${Math.round(committed / 1e6)}M committed of $75M
            </p>
          </div>
        )}
      </header>

      <div className="grid lg:grid-cols-[1fr_260px] gap-10 lg:gap-14">
        {/* Living doc + notes */}
        <div className="min-w-0 space-y-10">
          {body && (
            <section className="rise rise-1">
              <Markdown>{body}</Markdown>
            </section>
          )}

          {commits.length > 0 && (
            <section className="rise rise-2">
              <p className="eyebrow mb-3">Code</p>
              <ul className="space-y-2">
                {commits.map((c) => (
                  <li key={c.sha} className="text-sm flex items-baseline gap-2.5">
                    <code className="text-[11px] text-faint font-mono shrink-0">
                      {c.sha}
                    </code>
                    <span className="truncate">{c.message}</span>
                    {c.date && (
                      <span className="text-[11px] text-faint shrink-0 ml-auto">
                        {relativeTime(c.date)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rise rise-3">
            <p className="eyebrow mb-3">Notes</p>
            <div className="space-y-3 mb-4">
              {(comments.data as Comment[])?.map((c) => (
                <div key={c.id} className="text-sm">
                  <span
                    className={`text-xs font-medium mr-2 ${c.author_type === "aware" ? "" : "text-muted"}`}
                    style={
                      c.author_type === "aware"
                        ? { color: "var(--accent)" }
                        : undefined
                    }
                  >
                    {c.author_name}
                  </span>
                  <span className="text-xs text-faint">
                    {relativeTime(c.created_at)}
                  </span>
                  <p className="mt-1 leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
            <CommentForm targetType={table} targetId={id} />
          </section>
        </div>

        {/* Right rail */}
        <aside className="space-y-8 lg:border-l lg:border-line lg:pl-8 rise rise-2">
          <div>
            <p className="eyebrow mb-3">Status</p>
            {row.status ? (
              <StatusPicker table={table} id={id} current={row.status} />
            ) : (
              <span className="text-sm text-muted">—</span>
            )}
          </div>

          {meta.length > 0 && (
            <dl className="space-y-2.5">
              {meta.map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-3 text-sm">
                  <dt className="text-faint text-xs w-16 shrink-0">{k}</dt>
                  <dd className="text-muted min-w-0 truncate">{v}</dd>
                </div>
              ))}
              <div className="flex items-baseline gap-3 text-sm">
                <dt className="text-faint text-xs w-16 shrink-0">updated</dt>
                <dd className="text-muted">
                  {relativeTime(row.updated_at ?? row.created_at)}
                </dd>
              </div>
            </dl>
          )}

          {links.length > 0 && (
            <div>
              <p className="eyebrow mb-3">Connected</p>
              <div className="flex flex-col gap-1.5">
                {links.map((l, i) => (
                  <Link
                    key={i}
                    href={entityPath(l.type, l.id)}
                    className="text-sm text-muted hover:text-fg transition-colors truncate"
                  >
                    <span className="text-faint text-xs">
                      {l.direction === "out" ? l.relation : `${l.relation} by`}{" "}
                    </span>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(activity.data as Activity[])?.length > 0 && (
            <div>
              <p className="eyebrow mb-3">History</p>
              <ul className="space-y-2">
                {(activity.data as Activity[]).map((a) => (
                  <li key={a.id} className="text-xs text-muted leading-relaxed">
                    <span
                      className={a.actor_type === "aware" ? "" : "text-faint"}
                      style={
                        a.actor_type === "aware"
                          ? { color: "var(--accent)" }
                          : undefined
                      }
                    >
                      {a.actor_name}
                    </span>{" "}
                    {a.verb}
                    <span className="text-faint"> · {relativeTime(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
