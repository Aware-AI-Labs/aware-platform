"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Result {
  type: string;
  id: string;
  label: string;
  hint: string;
}

export function CommandK() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("aware:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("aware:command", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    abortRef.current?.abort();
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data.results ?? []);
        setSelected(0);
      } catch {
        /* aborted */
      }
    }, 140);
    return () => clearTimeout(t);
  }, [query]);

  const askAware = useCallback(() => {
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent("aware:ask", { detail: { question: query } })
    );
  }, [query]);

  const go = useCallback(
    (r: Result) => {
      setOpen(false);
      router.push(`/e/${r.type}/${r.id}`);
    },
    [router]
  );

  // rows = results + trailing "ask AWARE" action
  const total = results.length + (query.trim() ? 1 : 0);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selected < results.length) go(results[selected]);
      else if (query.trim()) askAware();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[16vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-raised border border-line-strong rounded-xl overflow-hidden shadow-2xl rise"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Search the company, or ask AWARE…"
          className="w-full bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-faint border-b border-line"
        />
        <div className="max-h-72 overflow-y-auto py-1.5">
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => go(r)}
              onMouseEnter={() => setSelected(i)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors ${
                selected === i ? "bg-hover" : ""
              }`}
            >
              <span className="truncate">{r.label}</span>
              <span className="text-xs text-faint shrink-0">{r.hint}</span>
            </button>
          ))}
          {query.trim() && (
            <button
              onClick={askAware}
              onMouseEnter={() => setSelected(results.length)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                selected === results.length ? "bg-hover" : ""
              }`}
            >
              <span
                className="text-[10px] font-medium tracking-wider uppercase"
                style={{ color: "var(--accent)" }}
              >
                AWARE
              </span>
              <span className="text-muted truncate">
                Ask: “{query.trim()}”
              </span>
            </button>
          )}
          {!results.length && !query.trim() && (
            <p className="px-4 py-6 text-sm text-faint">
              Workstreams, tasks, people, docs, decisions, experiments — or ask
              AWARE anything.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
