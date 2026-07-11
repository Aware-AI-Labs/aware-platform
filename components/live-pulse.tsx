"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { relativeTime, entityPath } from "@/lib/format";
import type { Activity } from "@/lib/types";

/** Activity feed that stays alive — new events slide in via realtime. */
export function LivePulse({ initial }: { initial: Activity[] }) {
  const [items, setItems] = useState<Activity[]>(initial);
  const [liveIds, setLiveIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("pulse")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity" },
        (payload) => {
          const row = payload.new as Activity;
          setItems((prev) =>
            prev.some((i) => i.id === row.id)
              ? prev
              : [row, ...prev].slice(0, 12)
          );
          setLiveIds((prev) => new Set(prev).add(row.id));
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!items.length)
    return <p className="text-faint text-sm py-4">Quiet.</p>;

  return (
    <ul>
      {items.map((a) => (
        <li
          key={a.id}
          className={`flex items-baseline gap-2 py-2 border-b border-line last:border-0 text-sm ${
            liveIds.has(a.id) ? "slide-in" : ""
          }`}
        >
          <span
            className={`shrink-0 text-xs font-medium ${
              a.actor_type === "aware" ? "" : "text-muted"
            }`}
            style={
              a.actor_type === "aware" ? { color: "var(--accent)" } : undefined
            }
          >
            {a.actor_name}
          </span>
          <span className="text-muted min-w-0 truncate">
            {a.verb}
            {a.target_label && (
              <>
                {" "}
                {a.target_id ? (
                  <Link
                    href={entityPath(a.target_type, a.target_id)}
                    className="text-fg hover:underline underline-offset-2"
                  >
                    {a.target_label}
                  </Link>
                ) : (
                  <span className="text-fg">{a.target_label}</span>
                )}
              </>
            )}
          </span>
          <span className="ml-auto shrink-0 text-xs text-faint">
            {relativeTime(a.created_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
