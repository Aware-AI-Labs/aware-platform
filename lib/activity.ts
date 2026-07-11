import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActorType } from "@/lib/types";

/** Append to the company's audit trail. Never throws. */
export async function logActivity(
  supabase: SupabaseClient,
  entry: {
    actor_type: ActorType;
    actor_name: string;
    verb: string;
    target_type?: string;
    target_id?: string | null;
    target_label?: string;
    detail?: string;
    meta?: Record<string, unknown>;
  }
) {
  await supabase.from("activity").insert({
    target_type: "",
    target_label: "",
    detail: "",
    meta: {},
    ...entry,
  });
}
