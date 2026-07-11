import { NextResponse } from "next/server";
import { daily } from "@/lib/ai/heartbeat";
import { authorizeCron } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ skipped: "no ANTHROPIC_API_KEY" });

  // Idempotent per UTC day unless forced.
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (!force) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ai_state")
      .select("last_daily")
      .eq("id", 1)
      .maybeSingle();
    if (
      data?.last_daily &&
      data.last_daily.slice(0, 10) === new Date().toISOString().slice(0, 10)
    ) {
      return NextResponse.json({ skipped: "already ran today" });
    }
  }

  const note = await daily();
  return NextResponse.json({ ok: true, note });
}
