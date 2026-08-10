"use server";

import { redirect } from "next/navigation";

import {
  getApplicationBaseUrl,
  getHumanAuthEnabled,
  getSelfSignupEnabled,
} from "@/lib/auth/auth-environment";
import {
  ensureAccessRequestFromMetadata,
  loadSignupOptions,
} from "@/lib/auth/access-onboarding";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SelfServiceRole } from "@/types/access-onboarding";

export type SignupState = {
  status: "idle" | "error" | "confirmation-required";
  message: string | null;
};

const allowedRoles = new Set<SelfServiceRole>([
  "utility-worker",
  "supervisor-manager",
  "technician",
]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function error(message: string): SignupState {
  return { status: "error", message };
}

export async function createAccount(
  _state: SignupState,
  formData: FormData,
): Promise<SignupState> {
  if (!getHumanAuthEnabled() || !getSelfSignupEnabled()) {
    return error("Account creation is unavailable in this environment.");
  }

  const fullNameValue = formData.get("fullName");
  const emailValue = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const organizationId = formData.get("organizationId");
  const locationId = formData.get("locationId");
  const requestedRole = formData.get("requestedRole");
  if (
    typeof fullNameValue !== "string" ||
    typeof emailValue !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string" ||
    typeof organizationId !== "string" ||
    typeof locationId !== "string" ||
    typeof requestedRole !== "string"
  ) {
    return error("Complete all required fields.");
  }

  const fullName = fullNameValue.trim();
  const email = emailValue.trim().toLowerCase();
  if (fullName.length < 2 || fullName.length > 255) {
    return error("Enter your full name.");
  }
  if (!emailPattern.test(email) || email.length > 320) {
    return error("Enter a valid work email.");
  }
  if (password.length < 8) {
    return error("Password must contain at least 8 characters.");
  }
  if (password !== confirmPassword) {
    return error("Passwords do not match.");
  }
  if (!allowedRoles.has(requestedRole as SelfServiceRole)) {
    return error("Select an available requested role.");
  }

  try {
    const options = await loadSignupOptions();
    const organizationExists = options.organizations.some(
      (organization) => organization.id === organizationId,
    );
    const locationMatches = options.locations.some(
      (location) =>
        location.id === locationId &&
        location.organizationId === organizationId,
    );
    if (!organizationExists || !locationMatches) {
      return error("Select a valid organization and workplace.");
    }
  } catch {
    return error("Account creation is temporarily unavailable.");
  }

  let signupResult;
  try {
    const supabase = await createSupabaseServerClient();
    signupResult = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getApplicationBaseUrl()}/login?confirmation=success`,
        data: {
          full_name: fullName,
          requested_organization_id: organizationId,
          requested_location_id: locationId,
          requested_role: requestedRole,
        },
      },
    });
  } catch {
    return error("Account creation is temporarily unavailable.");
  }
  const { data, error: signupError } = signupResult;
  if (signupError || !data.user) {
    return error(
      "Unable to create the account. Check your information or sign in if you already have an account.",
    );
  }

  if (data.session) {
    try {
      await ensureAccessRequestFromMetadata(
        data.session.access_token,
        data.user,
      );
    } catch {
      return error(
        "Your account was created, but the access request could not be submitted. Sign in to try again.",
      );
    }
    redirect("/");
  }

  return {
    status: "confirmation-required",
    message:
      "Check your work email to verify your account. After verification, sign in to submit your access request for review.",
  };
}
