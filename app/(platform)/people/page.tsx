import { createClient } from "@/lib/supabase/server";
import { getProfile, entityPath } from "@/lib/data";
import { PageHeader, Row, Status, Empty } from "@/components/ui";
import { InviteForm } from "@/components/invite-form";
import type { Person } from "@/lib/types";

export const metadata = { title: "People" };

const GROUPS: Array<{ kinds: string[]; label: string }> = [
  { kinds: ["teammate", "ai"], label: "Team" },
  { kinds: ["candidate"], label: "Candidates" },
  { kinds: ["investor", "advisor"], label: "Investors & advisors" },
  { kinds: ["vendor", "contact"], label: "Vendors & contacts" },
];

export default async function PeoplePage() {
  const profile = (await getProfile())!;
  const supabase = await createClient();
  const { data } = await supabase
    .from("people")
    .select("*")
    .order("updated_at", { ascending: false });
  const people = (data as Person[]) ?? [];

  return (
    <div className="space-y-12">
      <PageHeader title="People." />

      {profile.role === "founder" && (
        <section className="rise rise-1">
          <p className="eyebrow mb-3">Invite</p>
          <InviteForm />
        </section>
      )}

      {GROUPS.map(({ kinds, label }) => {
        const rows = people.filter((p) => kinds.includes(p.kind));
        if (!rows.length && label !== "Candidates") return null;
        return (
          <section key={label} className="rise rise-2">
            <p className="eyebrow mb-3">{label}</p>
            {rows.length ? (
              <div>
                {rows.map((p) => (
                  <Row key={p.id} href={entityPath("people", p.id)}>
                    <span className="text-sm font-medium truncate">
                      {p.kind === "ai" ? (
                        <span style={{ color: "var(--accent)" }}>{p.name}</span>
                      ) : (
                        p.name
                      )}
                    </span>
                    <span className="text-xs text-faint truncate hidden sm:block">
                      {[p.title, p.org].filter(Boolean).join(" · ")}
                    </span>
                    <span className="ml-auto shrink-0">
                      <Status status={p.status} />
                    </span>
                  </Row>
                ))}
              </div>
            ) : (
              <Empty>25 seats open.</Empty>
            )}
          </section>
        );
      })}
    </div>
  );
}
