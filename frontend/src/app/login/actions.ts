"use server";

import { redirect } from "next/navigation";

import { getHumanAuthEnabled } from "@/lib/auth/auth-environment";
import { loadHumanAccount } from "@/lib/auth/human-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function signIn(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!getHumanAuthEnabled()) {
    return { error: "Human sign-in is not enabled in this environment." };
  }

  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Unable to sign in with those credentials." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.session) {
    return { error: "Unable to sign in with those credentials." };
  }

  try {
    const account = await loadHumanAccount(data.session.access_token);
    if (!account.account) {
      await supabase.auth.signOut();
      return {
        error:
          account.status === 403
            ? "Your BevSense account is inactive or has no active organization membership."
            : "BevSense account access is temporarily unavailable.",
      };
    }
  } catch {
    await supabase.auth.signOut();
    return { error: "BevSense account access is temporarily unavailable." };
  }

  redirect("/");
}

export async function signOut() {
  if (getHumanAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
