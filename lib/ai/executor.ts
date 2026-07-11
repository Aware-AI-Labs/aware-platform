import type { SupabaseClient } from "@supabase/supabase-js";
import { openEditPr } from "@/lib/github";
import { logActivity } from "@/lib/activity";

interface ApprovalRow {
  id: string;
  title: string;
  action: { tool?: string; args?: Record<string, unknown> };
}

/**
 * Executes an approval's action after a human approved it.
 * This is the only path through which AWARE's consequential actions run.
 */
export async function executeApprovedAction(
  admin: SupabaseClient,
  approval: ApprovalRow
): Promise<{ ok: boolean; message: string }> {
  const tool = approval.action?.tool ?? "";
  const args = (approval.action?.args ?? {}) as Record<string, unknown>;

  try {
    switch (tool) {
      case "code_edit": {
        const pr = await openEditPr({
          repo: String(args.repo),
          path: String(args.path),
          newContent: String(args.new_content),
          commitMessage: String(args.commit_message),
          prTitle: String(args.pr_title ?? approval.title),
          prBody: String(args.pr_body ?? ""),
        });
        await logActivity(admin, {
          actor_type: "aware",
          actor_name: "AWARE",
          verb: "opened pull request",
          target_type: "approvals",
          target_id: approval.id,
          target_label: approval.title,
          detail: pr.url,
        });
        return { ok: true, message: `PR #${pr.number}: ${pr.url}` };
      }

      case "finance_write": {
        const values = args.values as Record<string, unknown>;
        if (args.id) {
          const { error } = await admin
            .from("finance_items")
            .update(values)
            .eq("id", args.id);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await admin.from("finance_items").insert(values);
          if (error) throw new Error(error.message);
        }
        return { ok: true, message: "Finance record written." };
      }

      case "delete_entity": {
        const table = String(args.table);
        const allowed = [
          "tasks",
          "docs",
          "experiments",
          "decisions",
          "people",
          "workstreams",
          "alerts",
          "finance_items",
        ];
        if (!allowed.includes(table)) throw new Error(`Cannot delete from ${table}`);
        const { error } = await admin.from(table).delete().eq("id", args.id);
        if (error) throw new Error(error.message);
        return { ok: true, message: `Deleted from ${table}.` };
      }

      default:
        return { ok: false, message: `Unknown action tool: ${tool}` };
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Execution failed",
    };
  }
}
