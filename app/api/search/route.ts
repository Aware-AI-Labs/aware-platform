import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Global search across the graph. RLS scopes results to the caller. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const like = `%${q}%`;

  const [workstreams, tasks, people, docs, decisions, experiments] =
    await Promise.all([
      supabase
        .from("workstreams")
        .select("id, name, kind, status")
        .or(`name.ilike.${like},summary.ilike.${like}`)
        .limit(6),
      supabase
        .from("tasks")
        .select("id, title, status")
        .ilike("title", like)
        .limit(6),
      supabase
        .from("people")
        .select("id, name, kind, title")
        .or(`name.ilike.${like},org.ilike.${like},email.ilike.${like}`)
        .limit(6),
      supabase
        .from("docs")
        .select("id, title, kind")
        .textSearch("fts", q, { type: "websearch" })
        .limit(6),
      supabase
        .from("decisions")
        .select("id, title, status")
        .ilike("title", like)
        .limit(4),
      supabase
        .from("experiments")
        .select("id, name, status")
        .or(`name.ilike.${like},hypothesis.ilike.${like}`)
        .limit(4),
    ]);

  const results = [
    ...(workstreams.data ?? []).map((r) => ({
      type: "workstreams",
      id: r.id,
      label: r.name,
      hint: `${r.kind} · ${r.status}`,
    })),
    ...(tasks.data ?? []).map((r) => ({
      type: "tasks",
      id: r.id,
      label: r.title,
      hint: `task · ${r.status}`,
    })),
    ...(people.data ?? []).map((r) => ({
      type: "people",
      id: r.id,
      label: r.name,
      hint: [r.kind, r.title].filter(Boolean).join(" · "),
    })),
    ...(docs.data ?? []).map((r) => ({
      type: "docs",
      id: r.id,
      label: r.title,
      hint: `doc · ${r.kind}`,
    })),
    ...(decisions.data ?? []).map((r) => ({
      type: "decisions",
      id: r.id,
      label: r.title,
      hint: `decision · ${r.status}`,
    })),
    ...(experiments.data ?? []).map((r) => ({
      type: "experiments",
      id: r.id,
      label: r.name,
      hint: `experiment · ${r.status}`,
    })),
  ];

  return NextResponse.json({ results });
}
