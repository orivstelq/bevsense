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

export async function GET(request: NextRequest) {
  if (!getHumanAuthEnabled() || !getSelfSignupEnabled()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!tokenHash || !type || !emailOtpTypes.has(type as EmailOtpType)) {
    return NextResponse.redirect(
      new URL("/login?confirmation=failed", request.url),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });
  if (error || !data.session || !data.user) {
    return NextResponse.redirect(
      new URL("/login?confirmation=failed", request.url),
    );
  }
  try {
    const submitted = await ensureAccessRequestFromMetadata(
      data.session.access_token,
      data.user,
    );
    if (!submitted) throw new Error("Signup request metadata is unavailable.");
  } catch {
    return NextResponse.redirect(
      new URL("/login?confirmation=request-failed", request.url),
    );
  }
  return NextResponse.redirect(new URL("/", request.url));
}
