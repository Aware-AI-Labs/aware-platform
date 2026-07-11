"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Profile } from "@/lib/types";

interface Msg {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
}

const TOOL_LABELS: Record<string, string> = {
  search_graph: "searching the graph",
  read_entity: "reading",
  list_entities: "listing",
  create_entity: "creating",
  update_entity: "updating",
  link_entities: "linking",
  log_decision: "logging a decision",
  save_memory: "remembering",
  propose_action: "filing a proposal",
  read_repo_file: "reading code",
  propose_code_edit: "drafting a code change",
  web_search: "searching the web",
};

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
              if (
                ["create_entity", "update_entity", "link_entities", "log_decision", "propose_action", "propose_code_edit"].includes(evt.name)
              ) {
                mutated = true;
              }
              push((m) => ({
                ...m,
                tools: [...(m.tools ?? []), evt.name],
              }));
            } else if (evt.type === "error") {
              push((m) => ({
                ...m,
                content: m.content + `\n\n*${evt.message}*`,
              }));
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
      {/* Toggle */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Talk to AWARE"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-fg text-bg pl-3.5 pr-4 py-2.5 text-sm font-medium shadow-xl transition-transform hover:scale-[1.03]"
        >
          <span
            className="size-1.5 rounded-full pulse-dot"
            style={{ background: "var(--accent)" }}
          />
          AWARE
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:top-4 md:w-[400px] z-40 flex flex-col bg-raised md:border md:border-line-strong md:rounded-xl shadow-2xl">
          <header className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <div className="flex items-center gap-2">
              <span
                className="size-1.5 rounded-full pulse-dot"
                style={{ background: "var(--accent)" }}
              />
              <span className="text-sm font-medium">AWARE</span>
            </div>
            <div className="flex items-center gap-3">
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
                className="text-muted hover:text-fg transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {messages.length === 0 && (
              <div className="pt-6">
                <p className="text-sm text-muted leading-relaxed">
                  Ask anything. Or tell me what to do.
                </p>
                <div className="mt-5 space-y-1.5">
                  {[
                    "What matters today?",
                    "Where is the round?",
                    "What's stuck?",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full text-left text-sm text-faint hover:text-fg px-3 py-2 rounded-lg border border-line hover:border-line-strong transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i}>
                {m.role === "user" ? (
                  <p className="text-sm bg-hover rounded-lg px-3 py-2 ml-8">
                    {m.content}
                  </p>
                ) : (
                  <div>
                    {(m.tools?.length ?? 0) > 0 && (
                      <p className="text-[11px] text-faint mb-1.5">
                        {[...new Set(m.tools)]
                          .map((t) => TOOL_LABELS[t] ?? t)
                          .join(" · ")}
                      </p>
                    )}
                    <div className="prose-aware text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content ||
                          (busy && i === messages.length - 1 ? "…" : "")}
                      </ReactMarkdown>
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
            className="p-3 border-t border-line shrink-0"
          >
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
              className="w-full resize-none bg-bg border border-line rounded-lg px-3 py-2.5 text-sm outline-none focus:border-line-strong placeholder:text-faint"
            />
            <div className="flex items-center justify-end mt-2">
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-md bg-fg text-bg text-xs font-medium px-3 py-1.5 transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "Thinking…" : "Send"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
