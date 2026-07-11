"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Profile } from "@/lib/types";
import { Orb } from "@/components/ui";

interface Msg {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
}

const TOOL_LABELS: Record<string, string> = {
  search_graph: "searching the graph",
  read_entity: "reading",
  list_entities: "scanning",
  create_entity: "creating",
  update_entity: "updating",
  link_entities: "linking",
  log_decision: "logging decision",
  save_memory: "remembering",
  update_focus: "refocusing",
  propose_action: "filing proposal",
  read_repo_file: "reading code",
  list_commits: "reading commits",
  propose_code_edit: "drafting code change",
  web_search: "searching the web",
};

const MUTATING = new Set([
  "create_entity",
  "update_entity",
  "link_entities",
  "log_decision",
  "propose_action",
  "propose_code_edit",
]);

function MarkdownLinkified({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children: kids }) =>
          href?.startsWith("/") ? (
            <Link href={href}>{kids}</Link>
          ) : (
            <a href={href} target="_blank" rel="noreferrer">
              {kids}
            </a>
          ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

export function ChatPanel({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("aware-chat");
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("aware-chat", JSON.stringify(messages.slice(-40)));
    } catch {
      /* ignore */
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    function onAsk(e: Event) {
      const q = (e as CustomEvent).detail?.question ?? "";
      setOpen(true);
      if (q) void send(q);
      else setTimeout(() => inputRef.current?.focus(), 50);
    }
    window.addEventListener("aware:ask", onAsk);
    return () => window.removeEventListener("aware:ask", onAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, busy, pathname]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setBusy(true);
    setInput("");
    const history = [...messages, { role: "user" as const, content: question }];
    setMessages([...history, { role: "assistant", content: "", tools: [] }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          page: pathname,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        throw new Error(err || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let mutated = false;

      const push = (fn: (last: Msg) => Msg) =>
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = fn(next[next.length - 1]);
          return next;
        });

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === "text") {
              push((m) => ({ ...m, content: m.content + evt.text }));
            } else if (evt.type === "tool") {
              if (MUTATING.has(evt.name)) mutated = true;
              push((m) => ({ ...m, tools: [...(m.tools ?? []), evt.name] }));
            } else if (evt.type === "error") {
              push((m) => ({ ...m, content: m.content + `\n\n*${evt.message}*` }));
            }
          } catch {
            /* partial line */
          }
        }
      }
      if (mutated) router.refresh();
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = {
          ...last,
          content:
            last.content ||
            `Couldn't reach AWARE — ${err instanceof Error ? err.message : "unknown error"}`,
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Desktop toggle — mobile uses the bottom tab bar */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Talk to AWARE"
          className="hidden md:flex fixed bottom-5 right-5 z-40 items-center gap-2.5 rounded-full glass border border-line-strong pl-3.5 pr-4 py-2.5 text-sm font-medium shadow-xl transition-transform hover:scale-[1.03]"
        >
          <Orb size={10} />
          AWARE
        </button>
      )}

      {open && (
        <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:top-4 md:w-[420px] z-50 flex flex-col glass md:border md:border-line-strong md:rounded-2xl shadow-2xl">
          <header className="flex items-center justify-between px-4 py-3.5 border-b border-line shrink-0">
            <div className="flex items-center gap-2.5">
              <Orb size={12} active={busy} />
              <span className="text-sm font-medium">AWARE</span>
            </div>
            <div className="flex items-center gap-4">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-xs text-faint hover:text-muted transition-colors"
                >
                  clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted hover:text-fg transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-5"
          >
            {messages.length === 0 && (
              <div className="pt-8">
                <p className="text-sm text-muted">Ask anything. Or tell me what to do.</p>
                <div className="mt-5 space-y-1.5">
                  {["What matters today?", "Where is the round?", "What's stuck?"].map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="block w-full text-left text-sm text-faint hover:text-fg px-3 py-2 rounded-lg border border-line hover:border-line-strong transition-colors"
                      >
                        {s}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                {m.role === "user" ? (
                  <p className="text-sm bg-hover rounded-xl px-3.5 py-2.5 ml-10">
                    {m.content}
                  </p>
                ) : (
                  <div>
                    {(m.tools?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {[...new Set(m.tools)].map((t, j) => (
                          <span
                            key={`${t}-${j}`}
                            className="slide-in inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[10px] text-faint"
                          >
                            <span
                              aria-hidden
                              className="size-1 rounded-full"
                              style={{ background: "var(--accent)" }}
                            />
                            {TOOL_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="prose-aware text-sm">
                      <MarkdownLinkified>
                        {m.content || (busy && i === messages.length - 1 ? "…" : "")}
                      </MarkdownLinkified>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="p-3 border-t border-line shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={2}
                placeholder="Tell AWARE…"
                className="flex-1 resize-none bg-bg/60 border border-line rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-line-strong placeholder:text-faint"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-xl bg-fg text-bg text-xs font-medium px-3.5 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "…" : "Send"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
