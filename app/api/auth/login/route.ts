import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Invite-only magic-link login with founder bootstrap:
 * 1. If no profiles exist and the email matches FOUNDER_EMAIL, create the
 *    founder account.
 * 2. Otherwise the email must belong to an existing profile or invite.
 * 3. Send the magic link.
 */
export async function POST(request: Request) {
  const { email: rawEmail } = await request.json().catch(() => ({}));
  const email = String(rawEmail ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const admin = createAdminClient();
  const generic = { error: "This platform is invite-only. Ask the founder for access." };

  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const founderEmail = (process.env.FOUNDER_EMAIL ?? "").trim().toLowerCase();

  if (count === 0) {
    // Bootstrap: the very first sign-in must be the founder.
    if (!founderEmail || email !== founderEmail) {
      return NextResponse.json(generic, { status: 403 });
    }
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({ email, email_confirm: true });
    if (createError || !created.user) {
      return NextResponse.json(
        { error: "Could not create the founder account." },
        { status: 500 }
      );
    }
    await admin.from("profiles").insert({
      id: created.user.id,
      email,
      name: "Founder",
      role: "founder",
      title: "Founder & CEO",
    });
    await admin.from("activity").insert({
      actor_type: "system",
      actor_name: "Aware OS",
      verb: "bootstrapped founder account",
      target_type: "profiles",
      target_id: created.user.id,
      target_label: email,
    });
  } else {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (!profile) {
      const { data: invite } = await admin
        .from("invites")
        .select("id, role")
        .eq("email", email)
        .maybeSingle();
      if (!invite) {
        return NextResponse.json(generic, { status: 403 });
      }
      // Invited but never signed in — create the auth user + profile now.
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({ email, email_confirm: true });
      if (createError || !created.user) {
        return NextResponse.json(
          { error: "Could not activate the invite." },
          { status: 500 }
        );
      }
      await admin.from("profiles").insert({
        id: created.user.id,
        email,
        role: invite.role,
      });
    }
  }

  const origin = new URL(request.url).origin;
  const { error: otpError } = await admin.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (otpError) {
    return NextResponse.json(
      { error: "Could not send the sign-in link. Try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
