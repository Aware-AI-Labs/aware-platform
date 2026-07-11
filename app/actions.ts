"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/data";
import { logActivity } from "@/lib/activity";
import { executeApprovedAction } from "@/lib/ai/executor";
import type { EntityType } from "@/lib/types";

const LABEL_FIELD: Record<string, string> = {
  people: "name",
  workstreams: "name",
  experiments: "name",
  tasks: "title",
  decisions: "title",
  docs: "title",
  finance_items: "name",
};

async function actor() {
  const profile = await getProfile();
  if (!profile) throw new Error("Not signed in");
  return profile;
}

export async function addComment(
  targetType: string,
  targetId: string,
  body: string
) {
  const profile = await actor();
  if (!body.trim()) return;
  const supabase = await createClient();
  await supabase.from("comments").insert({
    target_type: targetType,
    target_id: targetId,
    author_type: "human",
    author_name: profile.name || profile.email,
    author_id: profile.id,
    body: body.trim(),
  });
  revalidatePath(`/e/${targetType}/${targetId}`);
}

export async function setStatus(
  table: EntityType,
  id: string,
  status: string
) {
  const profile = await actor();
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .update({ status })
    .eq("id", id)
    .select(`id, ${LABEL_FIELD[table]}`)
    .maybeSingle();
  if (data) {
    const row = data as unknown as Record<string, string>;
    await logActivity(supabase, {
      actor_type: "human",
      actor_name: profile.name || profile.email,
      verb: `set ${status}`,
      target_type: table,
      target_id: id,
      target_label: row[LABEL_FIELD[table]] ?? "",
    });
  }
  revalidatePath(`/e/${table}/${id}`);
  revalidatePath("/");
}

export async function createEntity(
  table: EntityType,
  values: Record<string, unknown>
) {
  const profile = await actor();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .insert(values)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await logActivity(supabase, {
    actor_type: "human",
    actor_name: profile.name || profile.email,
    verb: "created",
    target_type: table,
    target_id: data.id,
    target_label: String(values[LABEL_FIELD[table]] ?? ""),
  });
  revalidatePath("/");
  return data.id as string;
}

export async function invitePerson(email: string, role: "core" | "member") {
  const profile = await actor();
  if (profile.role !== "founder") throw new Error("Founder only");
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) throw new Error("Invalid email");

  const supabase = await createClient();
  const { error } = await supabase
    .from("invites")
    .insert({ email: clean, role, invited_by: profile.id });
  if (error) throw new Error(error.message);

  await logActivity(supabase, {
    actor_type: "human",
    actor_name: profile.name || profile.email,
    verb: "invited",
    target_type: "invites",
    target_label: clean,
    detail: `role: ${role}`,
  });
  revalidatePath("/people");
}

export async function ackAlert(id: string, status: "ack" | "resolved") {
  await actor();
  const supabase = await createClient();
  await supabase.from("alerts").update({ status }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/mind");
}

export async function decideApproval(id: string, approve: boolean) {
  const profile = await actor();
  if (profile.role !== "founder") throw new Error("Founder only");

  const supabase = await createClient();
  const { data: approval } = await supabase
    .from("approvals")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (!approval) return;

  if (!approve) {
    await supabase
      .from("approvals")
      .update({ status: "rejected", decided_by: profile.id })
      .eq("id", id);
    await logActivity(supabase, {
      actor_type: "human",
      actor_name: profile.name || profile.email,
      verb: "rejected proposal",
      target_type: "approvals",
      target_id: id,
      target_label: approval.title,
    });
  } else {
    await supabase
      .from("approvals")
      .update({ status: "approved", decided_by: profile.id })
      .eq("id", id);
    // Execution uses the service role — approved actions run with AWARE's authority.
    const admin = createAdminClient();
    const result = await executeApprovedAction(admin, approval);
    await admin
      .from("approvals")
      .update({
        status: result.ok ? "executed" : "failed",
        result: result.message,
      })
      .eq("id", id);
    await logActivity(admin, {
      actor_type: "human",
      actor_name: profile.name || profile.email,
      verb: result.ok ? "approved & executed" : "approved (execution failed)",
      target_type: "approvals",
      target_id: id,
      target_label: approval.title,
      detail: result.message,
    });
  }
  revalidatePath("/");
  revalidatePath("/mind");
}
