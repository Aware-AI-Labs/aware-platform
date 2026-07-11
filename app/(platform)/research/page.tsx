import { createClient } from "@/lib/supabase/server";
import { entityPath, relativeTime } from "@/lib/data";
import { PageHeader, Row, Status, Empty } from "@/components/ui";
import type { Experiment, Workstream } from "@/lib/types";

export const metadata = { title: "Research" };

export default async function ResearchPage() {
  const supabase = await createClient();
  const [ws, experiments] = await Promise.all([
    supabase
      .from("workstreams")
      .select("*")
      .eq("kind", "research")
      .order("priority"),
    supabase
      .from("experiments")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);

  const workstreams = (ws.data as Workstream[]) ?? [];
  const wsName = new Map(workstreams.map((w) => [w.id, w.name]));

  return (
    <div className="space-y-12">
      <PageHeader title="Research." />

      <section className="rise rise-1">
        <p className="eyebrow mb-3">Programs</p>
        <div>
          {workstreams.map((w) => (
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

      <section className="rise rise-2">
        <p className="eyebrow mb-3">Experiments</p>
        {(experiments.data as Experiment[])?.length ? (
          <div>
            {(experiments.data as Experiment[]).map((e) => (
              <Row key={e.id} href={entityPath("experiments", e.id)}>
                <span className="text-sm truncate">{e.name}</span>
                {e.workstream_id && wsName.get(e.workstream_id) && (
                  <span className="text-xs text-faint truncate hidden sm:block">
                    {wsName.get(e.workstream_id)}
                  </span>
                )}
                {e.verdict && (
                  <span className="text-xs text-muted truncate hidden md:block">
                    {e.verdict}
                  </span>
                )}
                <span className="ml-auto shrink-0 flex items-center gap-3">
                  <span className="text-xs text-faint">
                    {relativeTime(e.updated_at)}
                  </span>
                  <Status status={e.status} />
                </span>
              </Row>
            ))}
          </div>
        ) : (
          <Empty>No runs yet. Give AWARE a hypothesis.</Empty>
        )}
      </section>
    </div>
  );
}
