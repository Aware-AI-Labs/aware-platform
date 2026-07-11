import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, entityPath } from "@/lib/data";
import { PageHeader, Row, Status, Empty } from "@/components/ui";
import type { FinanceItem, Person, Workstream } from "@/lib/types";

export const metadata = { title: "Capital" };

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default async function CapitalPage() {
  const profile = (await getProfile())!;
  if (profile.role === "member") redirect("/");

  const supabase = await createClient();
  const [finance, fundraise, investors] = await Promise.all([
    supabase.from("finance_items").select("*").order("updated_at", { ascending: false }),
    supabase.from("workstreams").select("*").eq("kind", "fundraise").order("priority"),
    supabase
      .from("people")
      .select("*")
      .in("kind", ["investor", "advisor"])
      .order("updated_at", { ascending: false }),
  ]);

  const items = (finance.data as FinanceItem[]) ?? [];
  const active = items.filter((i) => i.status === "active");
  const balance = active
    .filter((i) => i.kind === "balance")
    .reduce((s, i) => s + Number(i.amount), 0);
  const monthlyBurn = active
    .filter((i) => (i.kind === "expense" || i.kind === "budget") && i.period === "monthly")
    .reduce((s, i) => s + Number(i.amount), 0);
  const monthlyRevenue = active
    .filter((i) => i.kind === "revenue" && i.period === "monthly")
    .reduce((s, i) => s + Number(i.amount), 0);
  const net = monthlyBurn - monthlyRevenue;
  const runwayMonths = balance > 0 && net > 0 ? balance / net : null;

  return (
    <div className="space-y-12">
      <PageHeader eyebrow="Capital" title="Money." />

      {/* Runway — the number that matters, big */}
      <section className="rise rise-1 grid grid-cols-2 sm:grid-cols-4 gap-6">
        <div>
          <p className="eyebrow">Runway</p>
          <p className="display text-3xl sm:text-4xl mt-2">
            {runwayMonths !== null
              ? `${runwayMonths.toFixed(1)} mo`
              : "—"}
          </p>
        </div>
        <div>
          <p className="eyebrow">Balance</p>
          <p className="display text-3xl sm:text-4xl mt-2">
            {balance ? money(balance) : "—"}
          </p>
        </div>
        <div>
          <p className="eyebrow">Burn / mo</p>
          <p className="display text-3xl sm:text-4xl mt-2">
            {monthlyBurn ? money(monthlyBurn) : "—"}
          </p>
        </div>
        <div>
          <p className="eyebrow">Revenue / mo</p>
          <p className="display text-3xl sm:text-4xl mt-2">
            {monthlyRevenue ? money(monthlyRevenue) : "—"}
          </p>
        </div>
      </section>

      <section className="rise rise-2">
        <p className="eyebrow mb-3">The round</p>
        <div>
          {(fundraise.data as Workstream[])?.map((w) => (
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
        <p className="eyebrow mb-3">Investor pipeline</p>
        {(investors.data as Person[])?.length ? (
          <div>
            {(investors.data as Person[]).map((p) => (
              <Row key={p.id} href={entityPath("people", p.id)}>
                <span className="text-sm font-medium truncate">{p.name}</span>
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
          <Empty>
            No investors tracked yet. Tell AWARE who you&apos;re talking to —
            it keeps the pipeline and drafts updates from live company data.
          </Empty>
        )}
      </section>

      <section className="rise rise-3">
        <p className="eyebrow mb-3">Ledger</p>
        {items.length ? (
          <div>
            {items.map((i) => (
              <Row key={i.id} href={entityPath("finance_items", i.id)}>
                <span className="text-xs text-faint w-24 shrink-0 uppercase tracking-wider">
                  {i.kind}
                </span>
                <span className="text-sm truncate">{i.name}</span>
                <span className="ml-auto shrink-0 text-sm font-medium">
                  {money(Number(i.amount))}
                  {i.period !== "once" && (
                    <span className="text-xs text-faint"> /{i.period === "monthly" ? "mo" : "yr"}</span>
                  )}
                </span>
              </Row>
            ))}
          </div>
        ) : (
          <Empty>
            Empty ledger. Give AWARE the numbers — balance, monthly burn,
            commitments — and runway computes itself. Finance writes always
            pass your approval.
          </Empty>
        )}
      </section>
    </div>
  );
}
