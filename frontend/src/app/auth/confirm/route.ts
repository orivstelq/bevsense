import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import {
  getHumanAuthEnabled,
  getSelfSignupEnabled,
} from "@/lib/auth/auth-environment";
import { ensureAccessRequestFromMetadata } from "@/lib/auth/access-onboarding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const emailOtpTypes = new Set<EmailOtpType>([
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
]);

function confirmationFailed(request: NextRequest) {
  return NextResponse.redirect(
    new URL("/login?confirmation=failed", request.url),
  );
}

export async function GET(request: NextRequest) {
  if (!getHumanAuthEnabled() || !getSelfSignupEnabled()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const tokenHashes = request.nextUrl.searchParams.getAll("token_hash");
  const types = request.nextUrl.searchParams.getAll("type");
  const tokenHashFlow =
    tokenHashes.length === 1 &&
    tokenHashes[0].length > 0 &&
    types.length === 1 &&
    emailOtpTypes.has(types[0] as EmailOtpType);
  if (!tokenHashFlow) {
    return confirmationFailed(request);
  }

  const supabase = await createSupabaseServerClient();
  let data;
  try {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHashes[0],
      type: types[0] as EmailOtpType,
    });
    if (result.error || !result.data.session || !result.data.user) {
      return confirmationFailed(request);
    }
    data = result.data;
  } catch {
    return confirmationFailed(request);
  }
  const { session, user } = data;
  if (!session || !user) return confirmationFailed(request);
  try {
    const submitted = await ensureAccessRequestFromMetadata(
      session.access_token,
      user,
    );
    if (!submitted) throw new Error("Signup request metadata is unavailable.");
  } catch {
    return NextResponse.redirect(
      new URL("/login?confirmation=request-failed", request.url),
    );
  }
  return NextResponse.redirect(new URL("/", request.url));
}
