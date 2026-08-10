"use server";

import { redirect } from "next/navigation";

import { getHumanAuthEnabled } from "@/lib/auth/auth-environment";
import {
  ensureAccessRequestFromMetadata,
  hasAccessRequestMetadata,
  loadAccessStatus,
} from "@/lib/auth/access-onboarding";
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

  if (data.user && hasAccessRequestMetadata(data.user)) {
    try {
      const accessStatus = await loadAccessStatus(data.session.access_token);
      if (accessStatus.status === "no-request") {
        await ensureAccessRequestFromMetadata(
          data.session.access_token,
          data.user,
        );
      }
    } catch {
      redirect("/");
    }
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
