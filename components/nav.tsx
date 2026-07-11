"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";

const ITEMS = [
  { href: "/", label: "Home" },
  { href: "/mind", label: "Mind" },
  { href: "/work", label: "Work" },
  { href: "/research", label: "Research" },
  { href: "/people", label: "People" },
  { href: "/capital", label: "Capital" },
  { href: "/knowledge", label: "Knowledge" },
];

export function Nav({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const visible = ITEMS.filter(
    (item) => item.href !== "/capital" || profile.role !== "member"
  );

  const links = visible.map((item) => {
    const active =
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`block rounded-md px-3 py-1.5 text-sm transition-colors whitespace-nowrap ${
          active ? "text-fg bg-hover" : "text-muted hover:text-fg"
        }`}
      >
        {item.label}
      </Link>
    );
  });

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-48 flex-col border-r border-line px-3 py-5">
        <Link href="/" className="px-3 mb-8 block">
          <span className="text-sm font-semibold tracking-tight">Aware OS</span>
        </Link>
        <nav className="flex flex-col gap-0.5">{links}</nav>
        <div className="mt-auto px-3">
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("aware:command"))
            }
            className="text-xs text-faint hover:text-muted transition-colors"
          >
            Search <kbd className="font-mono">⌘K</kbd>
          </button>
          <p className="text-xs text-faint mt-3 truncate">
            {profile.name || profile.email}
          </p>
          <p className="text-[10px] text-faint/70 uppercase tracking-wider mt-0.5">
            {profile.role}
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-line">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-sm font-semibold tracking-tight">Aware OS</span>
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("aware:command"))
            }
            className="text-xs text-faint"
          >
            Search
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">{links}</nav>
      </div>
    </>
  );
}
