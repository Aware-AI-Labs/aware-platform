"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";
import { Orb } from "@/components/ui";

const ITEMS = [
  { href: "/", label: "Home" },
  { href: "/mind", label: "Mind" },
  { href: "/work", label: "Work" },
  { href: "/research", label: "Research" },
  { href: "/people", label: "People" },
  { href: "/capital", label: "Capital" },
  { href: "/knowledge", label: "Knowledge" },
];

export function Nav({
  profile,
  focus,
  heartbeat,
}: {
  profile: Profile;
  focus: string;
  heartbeat: string;
}) {
  const pathname = usePathname();
  const visible = ITEMS.filter(
    (item) => item.href !== "/capital" || profile.role !== "member"
  );

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // First sentence of AWARE's focus, stripped of markdown
  const focusLine = focus
    .replace(/[#*_`]/g, "")
    .split(/(?<=\.)\s/)[0]
    ?.slice(0, 90);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-52 flex-col border-r border-line px-3 py-5 z-30">
        <Link href="/" className="px-3 block">
          <span className="text-sm font-semibold tracking-tight">Aware OS</span>
        </Link>

        <Link
          href="/mind"
          className="mx-1 mt-6 mb-7 px-2 py-2.5 rounded-lg hover:bg-hover transition-colors block"
        >
          <span className="flex items-center gap-2">
            <Orb size={10} />
            <span
              className="text-[10px] font-medium tracking-wider uppercase"
              style={{ color: "var(--accent)" }}
            >
              AWARE
            </span>
            <span className="text-[10px] text-faint ml-auto">{heartbeat}</span>
          </span>
          {focusLine && (
            <span className="block text-xs text-muted mt-2 leading-snug line-clamp-3">
              {focusLine}
            </span>
          )}
        </Link>

        <nav className="flex flex-col gap-0.5">
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive(item.href)
                  ? "text-fg bg-hover"
                  : "text-muted hover:text-fg"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto px-3">
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("aware:command"))
            }
            className="text-xs text-faint hover:text-muted transition-colors"
          >
            <kbd className="font-mono">⌘K</kbd>
          </button>
          <p className="text-xs text-faint mt-3 truncate">
            {profile.name || profile.email}
          </p>
        </div>
      </aside>

      {/* Mobile top: brand + AWARE line */}
      <div className="md:hidden sticky top-0 z-30 bg-bg/85 backdrop-blur border-b border-line px-4 py-3 flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight">Aware OS</span>
        <Link href="/mind" className="flex items-center gap-2 min-w-0 ml-auto">
          <Orb size={8} />
          <span className="text-[11px] text-faint truncate max-w-40">
            {focusLine || "AWARE"}
          </span>
        </Link>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-line-strong flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {[
          { href: "/", label: "Home" },
          { href: "/mind", label: "Mind" },
          { href: "/work", label: "Work" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 py-3.5 text-center text-xs transition-colors ${
              isActive(item.href) ? "text-fg" : "text-faint"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("aware:command"))}
          className="flex-1 py-3.5 text-center text-xs text-faint"
        >
          Search
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("aware:ask"))}
          className="flex-1 py-3.5 text-xs font-medium flex items-center justify-center gap-1.5"
          style={{ color: "var(--accent)" }}
        >
          <Orb size={7} />
          AWARE
        </button>
      </nav>
    </>
  );
}
