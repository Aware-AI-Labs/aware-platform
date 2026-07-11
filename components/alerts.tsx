"use client";

import { useTransition } from "react";
import { ackAlert } from "@/app/actions";
import type { Alert } from "@/lib/types";

const SEVERITY_COLOR: Record<string, string> = {
  info: "var(--muted)",
  warn: "var(--warn)",
  critical: "var(--danger)",
};

export function AlertRow({ alert }: { alert: Alert }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-line last:border-0">
      <span
        aria-hidden
        className="mt-1.5 size-1.5 rounded-full shrink-0"
        style={{ background: SEVERITY_COLOR[alert.severity] }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{alert.title}</p>
        {alert.body && (
          <p className="text-xs text-muted mt-0.5 leading-relaxed">{alert.body}</p>
        )}
      </div>
      <button
        disabled={pending}
        onClick={() => startTransition(() => ackAlert(alert.id, "resolved"))}
        className="text-xs text-faint hover:text-fg transition-colors shrink-0 disabled:opacity-40"
      >
        resolve
      </button>
    </div>
  );
}
