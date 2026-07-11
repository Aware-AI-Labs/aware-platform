import { createClient } from "@/lib/supabase/server";
import { entityPath, relativeTime } from "@/lib/data";
import { PageHeader, Row, Empty } from "@/components/ui";
import type { Decision, Doc } from "@/lib/types";

export const metadata = { title: "Knowledge" };

const DOC_GROUPS: Array<{ kinds: string[]; label: string }> = [
  { kinds: ["memo", "spec", "note"], label: "Memos & specs" },
  { kinds: ["brief", "weekly_review"], label: "Briefs & reviews" },
  { kinds: ["meeting"], label: "Meetings" },
  { kinds: ["investor_update"], label: "Investor updates" },
  { kinds: ["asset", "manual", "onboarding"], label: "Registry & manuals" },
];

export default async function KnowledgePage() {
  const supabase = await createClient();
  const [docs, decisions] = await Promise.all([
    supabase.from("docs").select("id, kind, title, created_by_name, updated_at").order("updated_at", { ascending: false }).limit(100),
    supabase.from("decisions").select("*").order("updated_at", { ascending: false }).limit(20),
  ]);

  const allDocs = (docs.data as Doc[]) ?? [];

  return (
    <div className="space-y-12">
      <PageHeader title="Knowledge." />

      <section className="rise rise-1">
        <p className="eyebrow mb-3">Decisions</p>
        {(decisions.data as Decision[])?.length ? (
          <div>
            {(decisions.data as Decision[]).map((d) => (
              <Row key={d.id} href={entityPath("decisions", d.id)}>
                <span className="text-sm truncate">{d.title}</span>
                <span
                  className="text-xs shrink-0"
                  style={{
                    color:
                      d.decided_by_type === "aware"
                        ? "var(--accent)"
                        : "var(--faint)",
                  }}
                >
                  {d.decided_by_name}
                </span>
                <span className="ml-auto shrink-0 text-xs text-faint">
                  {relativeTime(d.updated_at)}
                </span>
              </Row>
            ))}
          </div>
        ) : (
          <Empty>None yet.</Empty>
        )}
      </section>

      {DOC_GROUPS.map(({ kinds, label }) => {
        const rows = allDocs.filter((d) => kinds.includes(d.kind));
        if (!rows.length) return null;
        return (
          <section key={label} className="rise rise-2">
            <p className="eyebrow mb-3">{label}</p>
            <div>
              {rows.map((d) => (
                <Row key={d.id} href={entityPath("docs", d.id)}>
                  <span className="text-sm truncate">{d.title}</span>
                  {d.created_by_name && (
                    <span
                      className="text-xs shrink-0"
                      style={{
                        color:
                          d.created_by_name === "AWARE"
                            ? "var(--accent)"
                            : "var(--faint)",
                      }}
                    >
                      {d.created_by_name}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-xs text-faint">
                    {relativeTime(d.updated_at)}
                  </span>
                </Row>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
