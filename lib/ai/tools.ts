import type { SupabaseClient } from "@supabase/supabase-js";
import type Anthropic from "@anthropic-ai/sdk";
import { logActivity } from "@/lib/activity";
import { githubEnabled, listRecentCommits, readRepoFile } from "@/lib/github";

/** Tables AWARE may write to directly. Everything else goes through approvals. */
const SAFE_TABLES = [
  "workstreams",
  "tasks",
  "experiments",
  "decisions",
  "docs",
  "people",
  "alerts",
] as const;

const READ_TABLES = [...SAFE_TABLES, "finance_items", "links", "activity", "approvals", "ai_memory"] as const;

const LABEL_FIELD: Record<string, string> = {
  people: "name",
  workstreams: "name",
  experiments: "name",
  tasks: "title",
  decisions: "title",
  docs: "title",
  alerts: "title",
  finance_items: "name",
};

export function toolDefinitions(): Anthropic.Tool[] {
  return [
    {
      name: "search_graph",
      description:
        "Full-text search across the whole company graph: workstreams, tasks, people, docs, decisions, experiments. Use before assuming something doesn't exist.",
      input_schema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
    {
      name: "list_entities",
      description:
        "List rows from a table with optional filters. Tables: " + READ_TABLES.join(", "),
      input_schema: {
        type: "object",
        properties: {
          table: { type: "string" },
          status: { type: "string" },
          kind: { type: "string" },
          workstream_id: { type: "string" },
          limit: { type: "number", description: "default 20, max 50" },
        },
        required: ["table"],
      },
    },
    {
      name: "read_entity",
      description: "Read one row fully, including its links, recent activity, and comments.",
      input_schema: {
        type: "object",
        properties: { table: { type: "string" }, id: { type: "string" } },
        required: ["table", "id"],
      },
    },
    {
      name: "create_entity",
      description:
        `Create a row in one of: ${SAFE_TABLES.join(", ")}. For finance or deletions use propose_action. Provide only real column values. Key columns — tasks: title, body, status(todo|doing|blocked|done), priority(0-3), workstream_id, due_date; docs: kind(memo|spec|meeting|brief|onboarding|investor_update|asset|note), title, body; workstreams: kind(product|research|fundraise|ops), name, summary, body, status; experiments: name, hypothesis, dataset, compute, status, workstream_id; people: kind(teammate|candidate|investor|advisor|vendor|contact), name, email, org, title, status, body; alerts: severity(info|warn|critical), kind(alert|risk), title, body; decisions: use log_decision instead.`,
      input_schema: {
        type: "object",
        properties: {
          table: { type: "string" },
          values: { type: "object" },
        },
        required: ["table", "values"],
      },
    },
    {
      name: "update_entity",
      description: `Update columns on a row in one of: ${SAFE_TABLES.join(", ")}.`,
      input_schema: {
        type: "object",
        properties: {
          table: { type: "string" },
          id: { type: "string" },
          values: { type: "object" },
        },
        required: ["table", "id", "values"],
      },
    },
    {
      name: "link_entities",
      description:
        "Connect two entities in the graph with a relation (e.g. 'funds', 'trains', 'blocks', 'informs', 'related').",
      input_schema: {
        type: "object",
        properties: {
          from_type: { type: "string" },
          from_id: { type: "string" },
          to_type: { type: "string" },
          to_id: { type: "string" },
          relation: { type: "string" },
        },
        required: ["from_type", "from_id", "to_type", "to_id"],
      },
    },
    {
      name: "log_decision",
      description:
        "Log a decision in the decision log with full rationale. Set decided_by to who actually decided.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          context: { type: "string" },
          options: { type: "string" },
          choice: { type: "string" },
          rationale: { type: "string" },
          workstream_id: { type: "string" },
          decided_by: { type: "string", description: "'AWARE' or the human's name" },
        },
        required: ["title", "choice", "rationale"],
      },
    },
    {
      name: "save_memory",
      description:
        "Save a durable fact, preference, or insight to long-term memory so future conversations know it. Use for things worth remembering beyond this chat.",
      input_schema: {
        type: "object",
        properties: {
          content: { type: "string" },
          kind: { type: "string", enum: ["fact", "preference", "insight", "context"] },
        },
        required: ["content"],
      },
    },
    {
      name: "update_focus",
      description:
        "Update your own focus and open questions shown on the Mind page. Use during heartbeats or when your priorities genuinely shift.",
      input_schema: {
        type: "object",
        properties: {
          focus: { type: "string", description: "markdown, short — what you're driving now" },
          open_questions: { type: "string", description: "markdown list, optional" },
        },
        required: ["focus"],
      },
    },
    {
      name: "propose_action",
      description:
        "File a proposal for a consequential action that needs founder approval: finance writes (tool 'finance_write', args {values} or {id, values}), deletions (tool 'delete_entity', args {table, id}). The founder approves or rejects with one click.",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string", description: "What and why, in plain language." },
          tool: { type: "string", enum: ["finance_write", "delete_entity"] },
          args: { type: "object" },
        },
        required: ["title", "summary", "tool", "args"],
      },
    },
    ...(githubEnabled()
      ? ([
          {
            name: "read_repo_file",
            description:
              "Read a file or list a directory in a company GitHub repo (e.g. 'dimitri-sky/awareailabs-v3' for the website, 'Aware-AI-Labs/aware-platform' for this platform). Use to find what to change before proposing a code edit.",
            input_schema: {
              type: "object",
              properties: {
                repo: { type: "string", description: "owner/name" },
                path: { type: "string", description: "file or directory path, '' for root" },
              },
              required: ["repo", "path"],
            },
          },
          {
            name: "list_commits",
            description: "List recent commits in a company repo.",
            input_schema: {
              type: "object",
              properties: { repo: { type: "string" } },
              required: ["repo"],
            },
          },
          {
            name: "propose_code_edit",
            description:
              "Propose a code change: after founder approval this opens a pull request (branch + commit + PR — never direct to main). Provide the complete new file content.",
            input_schema: {
              type: "object",
              properties: {
                repo: { type: "string" },
                path: { type: "string" },
                new_content: { type: "string", description: "full new file content" },
                commit_message: { type: "string" },
                pr_title: { type: "string" },
                pr_body: { type: "string", description: "what changed and why" },
              },
              required: ["repo", "path", "new_content", "commit_message", "pr_title"],
            },
          },
        ] as Anthropic.Tool[])
      : []),
  ];
}

/**
 * Executes one tool call. `supabase` should be the caller's RLS-scoped client
 * in chat, or the admin client during heartbeats.
 */
export async function executeTool(
  supabase: SupabaseClient,
  actorName: string,
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "search_graph": {
        const q = String(input.query ?? "");
        const like = `%${q}%`;
        const [ws, tasks, people, docs, decisions, experiments] = await Promise.all([
          supabase.from("workstreams").select("id, kind, name, status, summary").or(`name.ilike.${like},summary.ilike.${like},body.ilike.${like}`).limit(8),
          supabase.from("tasks").select("id, title, status, priority, workstream_id").or(`title.ilike.${like},body.ilike.${like}`).limit(8),
          supabase.from("people").select("id, kind, name, org, title, status").or(`name.ilike.${like},org.ilike.${like},body.ilike.${like}`).limit(8),
          supabase.from("docs").select("id, kind, title").textSearch("fts", q, { type: "websearch" }).limit(8),
          supabase.from("decisions").select("id, title, status, choice").or(`title.ilike.${like},choice.ilike.${like}`).limit(5),
          supabase.from("experiments").select("id, name, status, verdict").or(`name.ilike.${like},hypothesis.ilike.${like}`).limit(5),
        ]);
        return JSON.stringify({
          workstreams: ws.data,
          tasks: tasks.data,
          people: people.data,
          docs: docs.data,
          decisions: decisions.data,
          experiments: experiments.data,
        });
      }

      case "list_entities": {
        const table = String(input.table);
        if (!READ_TABLES.includes(table as (typeof READ_TABLES)[number]))
          return `Error: cannot list ${table}`;
        let query = supabase.from(table).select("*");
        if (input.status) query = query.eq("status", input.status);
        if (input.kind) query = query.eq("kind", input.kind);
        if (input.workstream_id) query = query.eq("workstream_id", input.workstream_id);
        const limit = Math.min(Number(input.limit ?? 20), 50);
        const orderCol = table === "activity" ? "created_at" : "updated_at";
        const { data, error } = await query
          .order(table === "activity" ? "id" : orderCol, { ascending: false })
          .limit(limit);
        if (error) return `Error: ${error.message}`;
        // Trim heavy fields for context economy
        const slim = (data ?? []).map((row: Record<string, unknown>) => {
          const r = { ...row };
          if (typeof r.body === "string" && r.body.length > 400) r.body = r.body.slice(0, 400) + "…";
          delete r.fts;
          delete r.embedding;
          return r;
        });
        return JSON.stringify(slim);
      }

      case "read_entity": {
        const table = String(input.table);
        const id = String(input.id);
        if (!READ_TABLES.includes(table as (typeof READ_TABLES)[number]))
          return `Error: cannot read ${table}`;
        const [row, linksFrom, linksTo, acts, comments] = await Promise.all([
          supabase.from(table).select("*").eq("id", id).maybeSingle(),
          supabase.from("links").select("to_type, to_id, relation").eq("from_type", table).eq("from_id", id),
          supabase.from("links").select("from_type, from_id, relation").eq("to_type", table).eq("to_id", id),
          supabase.from("activity").select("actor_name, verb, detail, created_at").eq("target_type", table).eq("target_id", id).order("id", { ascending: false }).limit(8),
          supabase.from("comments").select("author_name, body, created_at").eq("target_type", table).eq("target_id", id).order("created_at", { ascending: false }).limit(8),
        ]);
        if (!row.data) return "Not found (or outside your scope).";
        const r = { ...row.data };
        delete r.fts;
        delete r.embedding;
        return JSON.stringify({
          entity: r,
          links_out: linksFrom.data,
          links_in: linksTo.data,
          recent_activity: acts.data,
          comments: comments.data,
        });
      }

      case "create_entity": {
        const table = String(input.table);
        if (!SAFE_TABLES.includes(table as (typeof SAFE_TABLES)[number]))
          return `Error: AWARE cannot write directly to ${table} — use propose_action.`;
        const values = { ...(input.values as Record<string, unknown>) };
        if (table === "docs" || table === "tasks") values.created_by_type = "aware";
        if (table === "docs") values.created_by_name = "AWARE";
        const { data, error } = await supabase.from(table).insert(values).select("id").single();
        if (error) return `Error: ${error.message}`;
        await logActivity(supabase, {
          actor_type: "aware",
          actor_name: "AWARE",
          verb: "created",
          target_type: table,
          target_id: data.id,
          target_label: String(values[LABEL_FIELD[table]] ?? ""),
          detail: `on behalf of ${actorName}`,
        });
        return JSON.stringify({ ok: true, id: data.id });
      }

      case "update_entity": {
        const table = String(input.table);
        if (!SAFE_TABLES.includes(table as (typeof SAFE_TABLES)[number]))
          return `Error: AWARE cannot write directly to ${table} — use propose_action.`;
        const values = input.values as Record<string, unknown>;
        delete values.id;
        const { data, error } = await supabase
          .from(table)
          .update(values)
          .eq("id", input.id)
          .select(`id, ${LABEL_FIELD[table]}`)
          .maybeSingle();
        if (error) return `Error: ${error.message}`;
        if (!data) return "Not found (or outside your scope).";
        const row = data as unknown as Record<string, string>;
        await logActivity(supabase, {
          actor_type: "aware",
          actor_name: "AWARE",
          verb: "updated",
          target_type: table,
          target_id: String(input.id),
          target_label: row[LABEL_FIELD[table]] ?? "",
          detail: Object.keys(values).join(", "),
        });
        return JSON.stringify({ ok: true });
      }

      case "link_entities": {
        const { error } = await supabase.from("links").insert({
          from_type: input.from_type,
          from_id: input.from_id,
          to_type: input.to_type,
          to_id: input.to_id,
          relation: input.relation ?? "related",
        });
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ ok: true });
      }

      case "log_decision": {
        const decidedBy = String(input.decided_by ?? "AWARE");
        const { data, error } = await supabase
          .from("decisions")
          .insert({
            title: input.title,
            context: input.context ?? "",
            options: input.options ?? "",
            choice: input.choice,
            rationale: input.rationale,
            workstream_id: input.workstream_id ?? null,
            decided_by_type: decidedBy === "AWARE" ? "aware" : "human",
            decided_by_name: decidedBy,
            status: "decided",
          })
          .select("id")
          .single();
        if (error) return `Error: ${error.message}`;
        await logActivity(supabase, {
          actor_type: decidedBy === "AWARE" ? "aware" : "human",
          actor_name: decidedBy,
          verb: "logged decision",
          target_type: "decisions",
          target_id: data.id,
          target_label: String(input.title),
        });
        return JSON.stringify({ ok: true, id: data.id });
      }

      case "save_memory": {
        const { error } = await supabase.from("ai_memory").insert({
          content: input.content,
          kind: input.kind ?? "fact",
          source: `conversation with ${actorName}`,
        });
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ ok: true });
      }

      case "update_focus": {
        const update: Record<string, unknown> = {
          focus: input.focus,
          updated_at: new Date().toISOString(),
        };
        if (input.open_questions !== undefined)
          update.open_questions = input.open_questions;
        const { error } = await supabase.from("ai_state").update(update).eq("id", 1);
        if (error) return `Error: ${error.message}`;
        return JSON.stringify({ ok: true });
      }

      case "propose_action": {
        const { data, error } = await supabase
          .from("approvals")
          .insert({
            title: input.title,
            summary: input.summary,
            action: { tool: input.tool, args: input.args },
            requested_by_type: "aware",
          })
          .select("id")
          .single();
        if (error) return `Error: ${error.message}`;
        await logActivity(supabase, {
          actor_type: "aware",
          actor_name: "AWARE",
          verb: "filed proposal",
          target_type: "approvals",
          target_id: data.id,
          target_label: String(input.title),
        });
        return JSON.stringify({
          ok: true,
          id: data.id,
          note: "Proposal filed — awaiting founder approval on Home.",
        });
      }

      case "read_repo_file": {
        const result = await readRepoFile(String(input.repo), String(input.path));
        if (result.type === "dir") return JSON.stringify(result.entries);
        return result.content.length > 24000
          ? result.content.slice(0, 24000) + "\n…(truncated)"
          : result.content;
      }

      case "list_commits": {
        const commits = await listRecentCommits(String(input.repo));
        return JSON.stringify(commits);
      }

      case "propose_code_edit": {
        const { data, error } = await supabase
          .from("approvals")
          .insert({
            title: String(input.pr_title),
            summary: `Code change to \`${input.repo}\` — \`${input.path}\`\n\n${input.pr_body ?? ""}\n\nOn approval, AWARE opens a pull request (never direct to main).`,
            action: {
              tool: "code_edit",
              args: {
                repo: input.repo,
                path: input.path,
                new_content: input.new_content,
                commit_message: input.commit_message,
                pr_title: input.pr_title,
                pr_body: input.pr_body ?? "",
              },
            },
            requested_by_type: "aware",
          })
          .select("id")
          .single();
        if (error) return `Error: ${error.message}`;
        await logActivity(supabase, {
          actor_type: "aware",
          actor_name: "AWARE",
          verb: "proposed code edit",
          target_type: "approvals",
          target_id: data.id,
          target_label: String(input.pr_title),
          detail: `${input.repo}: ${input.path}`,
        });
        return JSON.stringify({
          ok: true,
          id: data.id,
          note: "Code-edit proposal filed — PR opens after founder approval.",
        });
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : "tool failed"}`;
  }
}
