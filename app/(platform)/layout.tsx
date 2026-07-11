import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { CommandK } from "@/components/command-k";
import { ChatPanel } from "@/components/chat-panel";
import { getProfile, relativeTime } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: ai } = await supabase
    .from("ai_state")
    .select("focus, last_tick")
    .eq("id", 1)
    .maybeSingle();

  return (
    <div className="min-h-dvh">
      <Nav
        profile={profile}
        focus={ai?.focus ?? ""}
        heartbeat={ai?.last_tick ? relativeTime(ai.last_tick) : "—"}
      />
      <CommandK />
      <main className="md:pl-52 pb-28 md:pb-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-8 py-8 md:py-12">
          {children}
        </div>
      </main>
      <ChatPanel profile={profile} />
    </div>
  );
}
