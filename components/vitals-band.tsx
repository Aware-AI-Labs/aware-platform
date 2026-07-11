import { getVitals } from "@/lib/vitals";
import { Sparkline } from "@/components/ui";

const STATE_COLOR = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  bad: "var(--danger)",
} as const;

/** Live company vitals — renders only the services that are connected. */
export async function VitalsBand({
  extra,
}: {
  extra?: Array<{ id: string; label: string; value: string; sub: string }>;
}) {
  const vitals = await getVitals();
  const items = [
    ...(extra ?? []).map((e) => ({ ...e, spark: undefined, state: "ok" as const })),
    ...vitals,
  ];
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-y border-line">
      {items.map((v) => (
        <div
          key={v.id}
          className="py-5 px-1 sm:px-3 border-line [&:not(:first-child)]:sm:border-l"
        >
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-1 rounded-full dot-glow"
              style={{ color: STATE_COLOR[v.state], background: "currentcolor" }}
            />
            <p className="eyebrow">{v.label}</p>
          </div>
          <p className="display text-2xl sm:text-[1.7rem] mt-2 tabular-nums truncate">
            {v.value}
          </p>
          <div className="flex items-end justify-between gap-2 mt-1.5 min-h-5">
            <p className="text-[11px] text-faint truncate">{v.sub}</p>
            {v.spark && <Sparkline points={v.spark} width={56} height={16} />}
          </div>
        </div>
      ))}
    </div>
  );
}
