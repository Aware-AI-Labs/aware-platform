"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** The day's brief: headline shown by Home, body one click away. */
export function BriefReader({ body }: { body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-faint hover:text-fg transition-colors"
      >
        {open ? "close" : "read the brief →"}
      </button>
      {open && (
        <div className="prose-aware mt-4 max-w-2xl rise">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
