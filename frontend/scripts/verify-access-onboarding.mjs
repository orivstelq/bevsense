import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const authEnvironment = read("../src/lib/auth/auth-environment.ts");
const signupPage = read("../src/app/signup/page.tsx");
const signupActions = read("../src/app/signup/actions.ts");
const signupForm = read("../src/features/auth/signup-form.tsx");
const loginPage = read("../src/app/login/page.tsx");
const loginActions = read("../src/app/login/actions.ts");
const loginForm = read("../src/features/auth/login-form.tsx");
const brand = read("../src/components/brand/bevsense-brand.tsx");
const home = read("../src/app/page.tsx");
const productionHome = read("../src/features/product/production-home.tsx");
const statusPanel = read("../src/features/auth/access-status-panel.tsx");
const reviewPage = read("../src/app/access-requests/page.tsx");
const reviewActions = read("../src/app/access-requests/actions.ts");
const reviewSubmitButton = read(
  "../src/features/auth/access-request-submit-button.tsx",
);
const demoNavigation = read("../src/config/navigation.ts");
const onboardingClient = read("../src/lib/auth/access-onboarding.ts");
const humanAccount = read("../src/lib/auth/human-account.ts");
const confirmationRoute = read("../src/app/auth/confirm/route.ts");
const backendRoutes = read("../../backend/app/api/v1/access_requests.py");
const backendService = read("../../backend/app/services/access_request_service.py");

assert.match(authEnvironment, /import "server-only"/);
assert.match(authEnvironment, /BIB_SELF_SIGNUP_ENABLED/);
assert.match(authEnvironment, /\?\? "false"/);
assert.doesNotMatch(authEnvironment, /NEXT_PUBLIC/);
assert.match(productionHome, /selfSignupEnabled[\s\S]*Create Account/);
assert.match(signupPage, /Account creation is unavailable in this environment/);
assert.match(signupPage, /<SignupForm/);

for (const field of [
  "fullName",
  "email",
  "password",
  "confirmPassword",
  "organizationId",
  "locationId",
  "requestedRole",
]) {
  assert.match(signupForm, new RegExp(`name="${field}"`));
}
for (const role of ["utility-worker", "supervisor-manager", "technician"]) {
  assert.match(signupForm, new RegExp(`value="${role}"`));
}
assert.doesNotMatch(signupForm, /value="organization-admin"/);
assert.doesNotMatch(`${signupForm}\n${statusPanel}`, /Supabase/);
assert.match(loginPage, /href="\/signup"[\s\S]*Create Account/);
assert.match(signupPage, /href="\/login"[\s\S]*Sign In/);
assert.match(brand, /href="\/"/);

assert.match(signupActions, /supabase\.auth\.signUp/);
assert.match(signupActions, /requested_organization_id/);
assert.match(signupActions, /ensureAccessRequestFromMetadata/);
assert.match(
  signupActions,
  /if \(data\.session\)[\s\S]*ensureAccessRequestFromMetadata/,
);
assert.match(
  signupActions,
  /emailRedirectTo: `\$\{getApplicationBaseUrl\(\)\}\/login\?confirmation=success`/,
);
assert.doesNotMatch(signupActions, /emailRedirectTo:[^\n]*\/auth\/confirm/);
assert.match(loginPage, /confirmation === "success"/);
assert.match(loginPage, /Email verified\. Sign in to continue\./);
assert.doesNotMatch(confirmationRoute, /exchangeCodeForSession|getAll\("code"\)/);
assert.match(confirmationRoute, /supabase\.auth\.verifyOtp/);
assert.match(confirmationRoute, /ensureAccessRequestFromMetadata/);
assert.match(confirmationRoute, /getAll\("token_hash"\)/);
assert.match(confirmationRoute, /if \(!tokenHashFlow\)/);
assert.match(confirmationRoute, /confirmationFailed\(request\)/);
assert.match(confirmationRoute, /confirmation=failed/);
assert.doesNotMatch(confirmationRoute, /console\./);
assert.doesNotMatch(confirmationRoute, /error\.message|JSON\.stringify\(error\)/);
assert.match(loginActions, /loadAccessStatus/);
assert.match(loginActions, /ensureAccessRequestFromMetadata/);
assert.match(loginActions, /accessStatus\.status === "no-request"/);
assert.match(loginActions, /supabase\.auth\.signInWithPassword/);
assert.doesNotMatch(loginActions, /loadHumanAccount|getHumanSessionState/);
assert.doesNotMatch(
  `${confirmationRoute}\n${signupActions}\n${loginActions}`,
  /console\./,
);
assert.match(loginForm, /useFormStatus/);
assert.match(loginForm, /disabled=\{pending\}/);
assert.match(loginForm, /Signing in\.\.\./);
assert.match(signupForm, /useFormStatus/);
assert.match(signupForm, /disabled=\{pending\}/);
assert.match(signupForm, /Creating account\.\.\./);

assert.match(statusPanel, /Access awaiting approval/);
assert.match(statusPanel, /Access request not approved/);
assert.doesNotMatch(statusPanel, /Inventory|Alerts|Devices|Analytics/);
assert.match(home, /getHumanSessionState/);
assert.match(productionHome, /Manage Access/);
assert.match(reviewPage, /supervisor-manager/);
assert.match(reviewPage, /organization-admin/);
assert.match(reviewPage, /Promise\.all/);
assert.match(reviewPage, /loadHumanAccount\(accessToken\)/);
assert.match(reviewPage, /loadAccessRequestReview\(accessToken\)/);
assert.doesNotMatch(reviewPage, /BIB_HARDWARE_CONNECTIONS_ENABLED/);
assert.doesNotMatch(demoNavigation, /access-requests/i);

assert.match(onboardingClient, /Authorization: `Bearer/);
assert.match(onboardingClient, /api\/v1\/account\/access-request/);
assert.match(backendRoutes, /authenticate_human_identity/);
assert.match(backendRoutes, /authenticate_human_account/);
assert.match(backendService, /request\.auth_user_id == reviewer\.auth_user_id/);
assert.match(backendService, /request\.requested_organization_id/);
assert.match(backendService, /OrganizationMembershipRecord/);
assert.match(humanAccount, /getValidatedHumanAccessToken/);
assert.match(humanAccount, /getClaims\(\)[\s\S]*getSession\(\)/);
assert.match(reviewActions, /getValidatedHumanAccessToken/);
assert.doesNotMatch(reviewActions, /getHumanSessionState|loadHumanAccount/);
assert.match(reviewActions, /approveAccessRequest/);
assert.match(reviewSubmitButton, /useFormStatus/);
assert.match(reviewSubmitButton, /disabled=\{pending\}/);
assert.match(reviewSubmitButton, /Approving\.\.\./);
assert.match(reviewSubmitButton, /Rejecting\.\.\./);

const beforeApproval = backendService.split("def _apply_approval(")[0];
assert.doesNotMatch(
  beforeApproval.split("def submit_request(")[1].split("def list_requests(")[0],
  /session\.add\(\s*OrganizationMembershipRecord/,
  "Self-service request submission must not create membership authorization.",
);

console.log(
  "Access onboarding verification passed (feature gate, verify-then-sign-in confirmation, pending isolation, and server-enforced review boundaries).",
);
