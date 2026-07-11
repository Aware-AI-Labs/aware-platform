"use client";

import { useState, useTransition } from "react";
import { addComment, setStatus } from "@/app/actions";
import type { EntityType } from "@/lib/types";
import { StatusDot } from "@/components/ui";

const STATUS_OPTIONS: Partial<Record<EntityType, string[]>> = {
  workstreams: ["active", "planned", "paused", "shipped", "done"],
  tasks: ["todo", "doing", "blocked", "done", "cancelled"],
  experiments: ["planned", "running", "complete", "failed", "abandoned"],
  decisions: ["open", "decided", "superseded", "overridden"],
};

export function StatusPicker({
  table,
  id,
  current,
}: {
  table: EntityType;
  id: string;
  current: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const options = STATUS_OPTIONS[table];
  if (!options) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <StatusDot status={current} />
        {current}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-xs text-muted border border-line rounded-md px-2.5 py-1 hover:border-line-strong transition-colors disabled:opacity-50"
      >
        <StatusDot status={current} />
        {current}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 bg-raised border border-line-strong rounded-lg py-1 min-w-32 shadow-xl">
          {options.map((s) => (
            <button
              key={s}
              onClick={() => {
                setOpen(false);
                if (s !== current)
                  startTransition(() => setStatus(table, id, s));
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-fg transition-colors"
            >
              <StatusDot status={s} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentForm({
  targetType,
  targetId,
}: {
  targetType: string;
  targetId: string;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const text = body.trim();
        if (!text) return;
        setBody("");
        startTransition(() => addComment(targetType, targetId, text));
      }}
      className="flex gap-2"
    >
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment…"
        className="flex-1 bg-raised border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-line-strong placeholder:text-faint"
      />
      <button
        type="submit"
        disabled={pending || !body.trim()}
        className="rounded-lg bg-fg text-bg text-xs font-medium px-3 transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Post
      </button>
    </form>
  );
}
