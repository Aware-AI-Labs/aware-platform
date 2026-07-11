"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Result {
  type: string;
  id: string;
  label: string;
  hint: string;
}

interface Item {
  key: string;
  section: string;
  label: string;
  hint?: string;
  run: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  workstreams: "Work",
  tasks: "Tasks",
  people: "People",
  docs: "Docs",
  decisions: "Decisions",
  experiments: "Experiments",
};

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
      setSelected(0);
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

  const close = useCallback(() => setOpen(false), []);

  const items = useMemo<Item[]>(() => {
    const q = query.trim();
    const actions: Item[] = [
      {
        key: "ask",
        section: "AWARE",
        label: q ? `Ask AWARE: “${q}”` : "Ask AWARE",
        run: () => {
          close();
          window.dispatchEvent(
            new CustomEvent("aware:ask", { detail: { question: q } })
          );
        },
      },
      ...(q
        ? [
            {
              key: "task",
              section: "AWARE",
              label: `Create task: “${q}”`,
              run: () => {
                close();
                window.dispatchEvent(
                  new CustomEvent("aware:ask", {
                    detail: { question: `Create a task: ${q}` },
                  })
                );
              },
            },
          ]
        : [
            {
              key: "invite",
              section: "Go",
              label: "Invite someone",
              run: () => {
                close();
                router.push("/people");
              },
            },
            {
              key: "mind",
              section: "Go",
              label: "Watch AWARE think",
              hint: "Mind",
              run: () => {
                close();
                router.push("/mind");
              },
            },
          ]),
    ];
    const searchItems: Item[] = results.map((r) => ({
      key: `${r.type}-${r.id}`,
      section: TYPE_LABEL[r.type] ?? r.type,
      label: r.label,
      hint: r.hint,
      run: () => {
        close();
        router.push(`/e/${r.type}/${r.id}`);
      },
    }));
    // Results first when searching; actions first when empty
    return q ? [...searchItems, ...actions] : actions;
  }, [query, results, router, close]);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[selected]?.run();
    }
  }

  if (!open) return null;

  let lastSection = "";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[14vh] px-4"
      onClick={close}
    >
      <div
        className="w-full max-w-lg glass border border-line-strong rounded-2xl overflow-hidden shadow-2xl rise"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Search, jump, create, or ask…"
          className="w-full bg-transparent px-5 py-4 text-sm outline-none placeholder:text-faint border-b border-line"
        />
        <div className="max-h-80 overflow-y-auto py-1.5">
          {items.map((item, i) => {
            const showSection = item.section !== lastSection;
            lastSection = item.section;
            return (
              <div key={item.key}>
                {showSection && (
                  <p className="eyebrow px-5 pt-3 pb-1.5">{item.section}</p>
                )}
                <button
                  onClick={item.run}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center justify-between gap-3 px-5 py-2 text-left text-sm transition-colors ${
                    selected === i ? "bg-hover" : ""
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  {item.hint && (
                    <span className="text-xs text-faint shrink-0">
                      {item.hint}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
