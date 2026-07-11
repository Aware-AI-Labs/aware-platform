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

export function Orb({
  size = 10,
  active = false,
}: {
  size?: number;
  active?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`orb inline-block shrink-0 ${active ? "orb--active" : ""}`}
      style={{ width: size, height: size }}
    />
  );
}

export function Sparkline({
  points,
  width = 72,
  height = 20,
  accent = false,
}: {
  points: number[];
  width?: number;
  height?: number;
  accent?: boolean;
}) {
  if (!points.length || points.every((p) => p === 0)) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line
          x1="0"
          y1={height - 1}
          x2={width}
          y2={height - 1}
          stroke="var(--line-strong)"
          strokeWidth="1"
        />
      </svg>
    );
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1 || 1);
  const d = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(
          height -
          2 -
          ((p - min) / range) * (height - 4)
        ).toFixed(1)}`
    )
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={accent ? "var(--accent)" : "var(--muted)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={accent ? 1 : 0.8}
      />
    </svg>
  );
}

export function ProgressHair({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-px bg-line-strong relative overflow-visible">
      <div
        className="absolute inset-y-0 left-0 h-px"
        style={{
          width: `${pct}%`,
          background: "var(--accent)",
          boxShadow: "0 0 8px rgba(255,77,0,0.6)",
        }}
      />
    </div>
  );
}

export function Card({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block border border-line rounded-xl p-5 transition-colors hover:border-line-strong hover:bg-raised group"
    >
      {children}
    </Link>
  );
}

export function Chip({
  children,
  tint,
}: {
  children: React.ReactNode;
  tint?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 border border-line rounded-full px-2.5 py-1 text-xs text-muted"
      style={tint ? { borderColor: `color-mix(in srgb, ${tint} 35%, transparent)` } : undefined}
    >
      {children}
    </span>
  );
}
