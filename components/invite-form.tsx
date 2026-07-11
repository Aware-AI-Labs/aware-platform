"use client";

import { useState, useTransition } from "react";
import { invitePerson } from "@/app/actions";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"core" | "member">("member");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const clean = email.trim();
        if (!clean) return;
        setMessage("");
        startTransition(async () => {
          try {
            await invitePerson(clean, role);
            setEmail("");
            setMessage(`Invited ${clean}. They sign in at this URL with their email.`);
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Invite failed");
          }
        });
      }}
      className="max-w-md"
    >
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@awareailabs.com"
          className="flex-1 min-w-0 bg-raised border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-line-strong placeholder:text-faint"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "core" | "member")}
          className="bg-raised border border-line rounded-lg px-2 py-2 text-xs text-muted outline-none"
        >
          <option value="member">member</option>
          <option value="core">core</option>
        </select>
        <button
          type="submit"
          disabled={pending || !email.trim()}
          className="rounded-lg bg-fg text-bg text-xs font-medium px-3 transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Invite
        </button>
      </div>
      <p className="text-xs text-faint mt-2">
        member — all non-sensitive knowledge · core — includes capital &
        sensitive
      </p>
      {message && <p className="text-xs text-muted mt-1">{message}</p>}
    </form>
  );
}
