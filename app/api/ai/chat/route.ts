import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data";
import { assembleContext, runAware, PERSONA, MODEL } from "@/lib/ai/aware";

export const maxDuration = 300;

/** AWARE chat — streams NDJSON events. RLS-scoped to the caller. */
export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("AWARE is not configured yet (missing ANTHROPIC_API_KEY).", {
      status: 503,
    });
  }

  const { messages, page } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Bad request", { status: 400 });
  }

  const supabase = await createClient();
  const userName = profile.name || profile.email;
  const context = await assembleContext(supabase, {
    userName,
    userRole: profile.role,
    page,
  });

  const system = `${PERSONA}\n\n---\n\n${context}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const run = runAware({
          supabase,
          actorName: userName,
          system,
          messages: messages.slice(-24),
          model: MODEL,
        });
        for await (const event of run) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "error",
              message: err instanceof Error ? err.message : "AWARE hit an error.",
            }) + "\n"
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
