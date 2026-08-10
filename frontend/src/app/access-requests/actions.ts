"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveAccessRequest,
  rejectAccessRequest,
} from "@/lib/auth/access-onboarding";
import { getValidatedHumanAccessToken } from "@/lib/auth/human-account";
import type { SelfServiceRole } from "@/types/access-onboarding";

const approvableRoles = new Set<SelfServiceRole>([
  "utility-worker",
  "supervisor-manager",
  "technician",
]);

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : null;
}

async function reviewerToken() {
  const accessToken = await getValidatedHumanAccessToken();
  if (!accessToken) redirect("/");
  return accessToken;
}

export async function approveAccess(formData: FormData) {
  const requestId = textField(formData, "requestId");
  const role = textField(formData, "approvedRole");
  const locationId = textField(formData, "approvedLocationId");
  if (
    !requestId ||
    !role ||
    !locationId ||
    !approvableRoles.has(role as SelfServiceRole)
  ) {
    redirect("/access-requests?result=invalid");
  }
  const accessToken = await reviewerToken();
  try {
    await approveAccessRequest(
      accessToken,
      requestId,
      role as SelfServiceRole,
      locationId,
    );
  } catch {
    redirect("/access-requests?result=failed");
  }
  revalidatePath("/access-requests");
  redirect("/access-requests?result=approved");
}

export async function rejectAccess(formData: FormData) {
  const requestId = textField(formData, "requestId");
  const note = textField(formData, "reviewNote");
  if (!requestId || (note?.length ?? 0) > 1000) {
    redirect("/access-requests?result=invalid");
  }
  const accessToken = await reviewerToken();
  try {
    await rejectAccessRequest(accessToken, requestId, note?.trim() || null);
  } catch {
    redirect("/access-requests?result=failed");
  }
  revalidatePath("/access-requests");
  redirect("/access-requests?result=rejected");
}
