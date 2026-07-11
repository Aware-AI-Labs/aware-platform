"use client";

import { useState, useTransition } from "react";
import { decideApproval } from "@/app/actions";
import type { Approval } from "@/lib/types";

export function ApprovalCard({
  approval,
  canDecide,
}: {
  approval: Approval;
  canDecide: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-line rounded-lg px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{approval.title}</p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-faint hover:text-muted transition-colors mt-0.5"
          >
            {expanded ? "hide detail" : "show detail"}
          </button>
          {expanded && (
            <p className="text-xs text-muted mt-2 whitespace-pre-wrap leading-relaxed">
              {approval.summary || "No summary provided."}
            </p>
          )}
        </div>
        {canDecide && (
          <div className="flex gap-2 shrink-0">
            <button
              disabled={pending}
              onClick={() => startTransition(() => decideApproval(approval.id, true))}
              className="rounded-md bg-fg text-bg text-xs font-medium px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Approve
            </button>
            <button
              disabled={pending}
              onClick={() => startTransition(() => decideApproval(approval.id, false))}
              className="rounded-md border border-line text-xs text-muted px-3 py-1.5 hover:border-line-strong hover:text-fg transition-colors disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
