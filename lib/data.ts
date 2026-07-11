import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, role, title")
    .eq("id", user.id)
    .maybeSingle();
  return data as Profile | null;
}

export { relativeTime, entityPath } from "@/lib/format";
