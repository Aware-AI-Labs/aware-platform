import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { CommandK } from "@/components/command-k";
import { ChatPanel } from "@/components/chat-panel";
import { getProfile } from "@/lib/data";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="min-h-dvh">
      <Nav profile={profile} />
      <CommandK />
      <main className="md:pl-48 pb-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-8 py-8 md:py-12">
          {children}
        </div>
      </main>
      <ChatPanel profile={profile} />
    </div>
  );
}
