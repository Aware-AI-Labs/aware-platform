import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { entityPath, relativeTime } from "@/lib/data";
import { Markdown } from "@/components/ui";
import { ActivityFeed } from "@/components/activity-feed";
import { StatusPicker, CommentForm } from "@/components/entity-controls";
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

  const [links, activity, comments, workstream] = await Promise.all([
    resolveLinks(supabase, table, id),
    supabase
      .from("activity")
      .select("*")
      .eq("target_type", table)
      .eq("target_id", id)
      .order("id", { ascending: false })
      .limit(15),
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
  ]);

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

  const meta: Array<[string, string]> = [];
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
        <h1 className="display text-3xl sm:text-4xl mt-2">{title}</h1>
        <div className="flex items-center gap-4 mt-4 flex-wrap text-xs text-muted">
          {row.status && <StatusPicker table={table} id={id} current={row.status} />}
          {meta.map(([k, v]) => (
            <span key={k}>
              <span className="text-faint">{k} </span>
              {v}
            </span>
          ))}
          {workstream.data && (
            <Link
              href={entityPath("workstreams", workstream.data.id)}
              className="hover:text-fg transition-colors"
            >
              <span className="text-faint">in </span>
              {workstream.data.name}
            </Link>
          )}
          {row.url && (
            <a
              href={row.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-fg transition-colors underline underline-offset-2"
            >
              {String(row.url).replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="text-faint">
            updated{" "}
            {relativeTime(row.updated_at ?? row.created_at) === "now"
              ? "just now"
              : `${relativeTime(row.updated_at ?? row.created_at)} ago`}
          </span>
        </div>
      </header>

      {row.summary && (
        <p className="text-muted text-sm max-w-2xl -mt-4 rise rise-1">{row.summary}</p>
      )}

      {body && (
        <section className="rise rise-1 max-w-2xl">
          <Markdown>{body}</Markdown>
        </section>
      )}

      {links.length > 0 && (
        <section className="rise rise-2">
          <p className="eyebrow mb-3">Connected</p>
          <div className="flex flex-wrap gap-2">
            {links.map((l, i) => (
              <Link
                key={i}
                href={entityPath(l.type, l.id)}
                className="inline-flex items-center gap-1.5 border border-line rounded-full px-3 py-1.5 text-xs hover:border-line-strong transition-colors"
              >
                <span className="text-faint">
                  {l.direction === "out" ? l.relation : `${l.relation} by`}
                </span>
                {l.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rise rise-3">
        <p className="eyebrow mb-3">Discussion</p>
        <div className="space-y-3 mb-4">
          {(comments.data as Comment[])?.map((c) => (
            <div key={c.id} className="text-sm">
              <span
                className={`text-xs font-medium mr-2 ${c.author_type === "aware" ? "" : "text-muted"}`}
                style={c.author_type === "aware" ? { color: "var(--accent)" } : undefined}
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

      <section className="rise rise-4">
        <p className="eyebrow mb-2">History</p>
        <ActivityFeed items={(activity.data as Activity[]) ?? []} />
      </section>
    </div>
  );
}
