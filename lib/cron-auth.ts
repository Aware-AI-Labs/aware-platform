import { NextResponse } from "next/server";

/** Cron endpoints accept the secret via Bearer header or ?secret= (for pg_cron). */
export function authorizeCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const header = request.headers.get("authorization");
  const param = new URL(request.url).searchParams.get("secret");
  if (header === `Bearer ${secret}` || param === secret) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
