"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const params = useSearchParams();
  const linkError = params.get("error") === "link";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || state === "sending") return;
    setState("sending");
    setMessage("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setState("sent");
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Something went wrong.");
      setState("error");
    }
  }

  return (
    <main className="min-h-dvh flex flex-col bg-bg">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <p className="eyebrow rise">Aware AI Labs</p>
          <h1 className="display text-5xl mt-3 rise rise-1">Aware OS.</h1>
          <p className="text-muted mt-4 text-sm leading-relaxed rise rise-2">
            The operating platform of the lab. One graph, run by AWARE.
          </p>

          {state === "sent" ? (
            <div className="mt-10 rise">
              <p className="text-sm">
                Check your email — the sign-in link is on its way.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-10 rise rise-3">
              <label htmlFor="email" className="eyebrow block mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@awareailabs.com"
                className="w-full bg-raised border border-line rounded-lg px-4 py-3 text-sm outline-none transition-colors focus:border-line-strong placeholder:text-faint"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                className="mt-3 w-full rounded-lg bg-fg text-bg text-sm font-medium py-3 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {state === "sending" ? "Sending…" : "Send sign-in link"}
              </button>
              {(message || linkError) && (
                <p className="mt-3 text-sm text-danger">
                  {message || "That link expired. Request a new one."}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
      <footer className="px-6 py-5 text-center">
        <p className="text-faint text-xs">
          Invite-only · Humanoid robots, and more.
        </p>
      </footer>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
