import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BevSenseBrand } from "@/components/brand/bevsense-brand";
import { AccessRequestList } from "@/features/auth/access-request-list";
import { signOut } from "@/app/login/actions";
import { loadAccessRequestReview } from "@/lib/auth/access-onboarding";
import { getHumanAuthEnabled } from "@/lib/auth/auth-environment";
import {
  getValidatedHumanAccessToken,
  loadHumanAccount,
} from "@/lib/auth/human-account";

export const metadata: Metadata = { title: "Access Requests | BevSense" };

type AccessRequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccessRequestsPage({
  searchParams,
}: AccessRequestsPageProps) {
  const params = await searchParams;
  if (params.mode !== undefined || !getHumanAuthEnabled()) redirect("/");
  const accessToken = await getValidatedHumanAccessToken();
  if (!accessToken) redirect("/");
  const [accountResult, review] = await Promise.all([
    loadHumanAccount(accessToken).catch(() => null),
    loadAccessRequestReview(accessToken).catch(() => null),
  ]);
  if (!accountResult?.account) redirect("/");
  const isReviewer = accountResult.account.memberships.some((membership) =>
    ["supervisor-manager", "organization-admin"].includes(membership.role),
  );
  if (!isReviewer) redirect("/");
  const result = typeof params.result === "string" ? params.result : null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <BevSenseBrand className="text-slate-950" />
          <div className="flex flex-wrap items-center gap-4">
            <Link
              className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              href="/"
            >
              Product Home
            </Link>
            <form action={signOut}>
              <button
                className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-amber-500"
                type="submit"
              >
                Sign Out
              </button>
            </form>
          </div>
        </header>

        <section className="py-8 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
            Account management
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Access Requests
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review requested access and assign final production permissions.
              </p>
            </div>
            {review && (
              <p className="text-sm font-semibold text-slate-700">
                Pending {review.requests.length}
              </p>
            )}
          </div>

          {result === "approved" && (
            <p className="mt-6 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">
              Access approved.
            </p>
          )}
          {result === "rejected" && (
            <p className="mt-6 rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700" role="status">
              Access request rejected.
            </p>
          )}
          {(result === "failed" || result === "invalid") && (
            <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
              The review could not be completed. Refresh and try again.
            </p>
          )}

          {review ? (
            <AccessRequestList account={accountResult.account} review={review} />
          ) : (
            <div className="mt-8 rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Access requests are temporarily unavailable.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
