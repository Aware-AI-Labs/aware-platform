"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEntity } from "@/app/actions";

export function QuickTask({
  workstreams,
}: {
  workstreams: Array<{ id: string; name: string }>;
}) {
  const [title, setTitle] = useState("");
  const [wsId, setWsId] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const text = title.trim();
        if (!text) return;
        setTitle("");
        startTransition(async () => {
          await createEntity("tasks", {
            title: text,
            workstream_id: wsId || null,
          });
          router.refresh();
        });
      }}
      className="flex gap-2"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New task…"
        className="flex-1 min-w-0 bg-raised border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-line-strong placeholder:text-faint"
      />
      <select
        value={wsId}
        onChange={(e) => setWsId(e.target.value)}
        className="bg-raised border border-line rounded-lg px-2 py-2 text-xs text-muted outline-none max-w-36"
      >
        <option value="">no workstream</option>
        {workstreams.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="rounded-lg bg-fg text-bg text-xs font-medium px-3 transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}
