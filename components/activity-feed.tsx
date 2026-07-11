import Link from "next/link";
import { relativeTime, entityPath } from "@/lib/data";
import type { Activity } from "@/lib/types";

export function ActivityFeed({ items }: { items: Activity[] }) {
  if (!items.length)
    return <p className="text-faint text-sm py-4">Quiet so far.</p>;

  return (
    <ul className="space-y-0">
      {items.map((a) => (
        <li
          key={a.id}
          className="flex items-baseline gap-2 py-2 border-b border-line last:border-0 text-sm"
        >
          <span
            className={`shrink-0 text-xs font-medium ${
              a.actor_type === "aware" ? "" : "text-muted"
            }`}
            style={a.actor_type === "aware" ? { color: "var(--accent)" } : undefined}
          >
            {a.actor_name}
          </span>
          <span className="text-muted min-w-0">
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
