import { createClient } from "@/lib/supabase/server";
import { entityPath } from "@/lib/data";
import { PageHeader, Row, Status, Empty } from "@/components/ui";
import { QuickTask } from "@/components/quick-task";
import type { Task, Workstream } from "@/lib/types";

export const metadata = { title: "Work" };

const GROUPS: Array<{ kind: Workstream["kind"]; label: string }> = [
  { kind: "product", label: "Products" },
  { kind: "research", label: "Research" },
  { kind: "fundraise", label: "Fundraise" },
  { kind: "ops", label: "Operations" },
];

export default async function WorkPage() {
  const supabase = await createClient();
  const [ws, tasks] = await Promise.all([
    supabase
      .from("workstreams")
      .select("*")
      .order("priority")
      .order("updated_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .in("status", ["todo", "doing", "blocked"])
      .order("priority")
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);

  const workstreams = (ws.data as Workstream[]) ?? [];
  const wsName = new Map(workstreams.map((w) => [w.id, w.name]));

  return (
    <div className="space-y-12">
      <PageHeader title="Work." />

      {GROUPS.map(({ kind, label }) => {
        const rows = workstreams.filter((w) => w.kind === kind);
        if (!rows.length) return null;
        return (
          <section key={kind} className="rise rise-1">
            <p className="eyebrow mb-3">{label}</p>
            <div>
              {rows.map((w) => (
                <Row key={w.id} href={entityPath("workstreams", w.id)}>
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
        );
      })}

      <section className="rise rise-2">
        <div className="flex items-baseline justify-between mb-3">
          <p className="eyebrow">Open tasks</p>
        </div>
        <QuickTask
          workstreams={workstreams.map((w) => ({ id: w.id, name: w.name }))}
        />
        <div className="mt-4">
          {(tasks.data as Task[])?.length ? (
            (tasks.data as Task[]).map((t) => (
              <Row key={t.id} href={entityPath("tasks", t.id)}>
                <span className="text-xs text-faint w-6 shrink-0">
                  p{t.priority}
                </span>
                <span className="text-sm truncate">{t.title}</span>
                {t.workstream_id && wsName.get(t.workstream_id) && (
                  <span className="text-xs text-faint truncate hidden sm:block">
                    {wsName.get(t.workstream_id)}
                  </span>
                )}
                <span className="ml-auto shrink-0">
                  <Status status={t.status} />
                </span>
              </Row>
            ))
          ) : (
            <Empty>Nothing open.</Empty>
          )}
        </div>
      </section>
    </div>
  );
}
