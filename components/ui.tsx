import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const STATUS_COLORS: Record<string, string> = {
  active: "var(--ok)",
  doing: "var(--ok)",
  running: "var(--ok)",
  shipped: "var(--accent)",
  done: "var(--faint)",
  complete: "var(--faint)",
  decided: "var(--fg)",
  todo: "var(--muted)",
  planned: "var(--muted)",
  open: "var(--warn)",
  pending: "var(--warn)",
  blocked: "var(--danger)",
  failed: "var(--danger)",
  critical: "var(--danger)",
  paused: "var(--faint)",
  cancelled: "var(--faint)",
};

export function StatusDot({ status }: { status: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-1.5 rounded-full shrink-0"
      style={{ background: STATUS_COLORS[status] ?? "var(--muted)" }}
    />
  );
}

export function Status({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <StatusDot status={status} />
      {status}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function PageHeader({
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 rise">
      <h1 className="display text-4xl sm:text-5xl">{title}</h1>
      {action}
    </header>
  );
}

export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className="display text-4xl sm:text-5xl tabular-nums"
        style={accent ? { color: "var(--accent)" } : undefined}
      >
        {value}
      </p>
      <p className="eyebrow mt-2">{label}</p>
    </div>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-aware">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function Row({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg transition-colors hover:bg-hover"
    >
      {children}
    </Link>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-faint text-sm py-8">{children}</p>;
}

export function ActorMark({ actorType }: { actorType: string }) {
  if (actorType !== "aware") return null;
  return (
    <span
      className="text-[10px] font-medium tracking-wider uppercase"
      style={{ color: "var(--accent)" }}
    >
      AWARE
    </span>
  );
}
