import { NextResponse } from "next/server";
import { tick } from "@/lib/ai/heartbeat";
import { authorizeCron } from "@/lib/cron-auth";

export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ skipped: "no ANTHROPIC_API_KEY" });
  const note = await tick();
  return NextResponse.json({ ok: true, note });
}
