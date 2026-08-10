import { approveAccess, rejectAccess } from "@/app/access-requests/actions";
import type { AuthenticatedRole, HumanAccount } from "@/lib/auth/human-account";
import type {
  AccessRequest,
  AccessRequestReview,
  SelfServiceRole,
} from "@/types/access-onboarding";

const roleLabels: Record<SelfServiceRole, string> = {
  "utility-worker": "Utility Worker",
  "supervisor-manager": "Supervisor / Manager",
  technician: "Technician",
};

function reviewerRoleFor(
  account: HumanAccount,
  organizationId: string,
): AuthenticatedRole | null {
  return (
    account.memberships.find(
      (membership) => membership.organizationId === organizationId,
    )?.role ?? null
  );
}

function AccessRequestCard({
  account,
  request,
  review,
}: {
  account: HumanAccount;
  request: AccessRequest;
  review: AccessRequestReview;
}) {
  const reviewerRole = reviewerRoleFor(
    account,
    request.requestedOrganizationId,
  );
  const roles: SelfServiceRole[] =
    reviewerRole === "organization-admin"
      ? ["utility-worker", "technician", "supervisor-manager"]
      : ["utility-worker", "technician"];
  const locations = review.locations.filter(
    (location) =>
      location.organizationId === request.requestedOrganizationId,
  );
  const defaultRole = roles.includes(request.requestedRole)
    ? request.requestedRole
    : roles[0];

  return (
    <li className="rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold text-slate-950">
            {request.fullName}
          </h2>
          <p className="mt-1 break-all text-sm text-slate-600">
            {request.verifiedEmail}
          </p>
        </div>
        <span className="text-sm font-semibold text-amber-700">Pending</span>
      </div>

      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Organization</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {request.requestedOrganizationName}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Requested workplace</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {request.requestedLocationName}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Requested role</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {roleLabels[request.requestedRole]}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-slate-500">
        Requested{" "}
        <time dateTime={request.createdAt}>
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          }).format(new Date(request.createdAt))}{" "}
          UTC
        </time>
      </p>

      <form action={approveAccess} className="mt-6 grid gap-4 rounded-md bg-slate-50 p-4 sm:grid-cols-2">
        <input name="requestId" type="hidden" value={request.id} />
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor={`role-${request.id}`}>
            Final role
          </label>
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400"
            defaultValue={defaultRole}
            id={`role-${request.id}`}
            name="approvedRole"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700" htmlFor={`location-${request.id}`}>
            Final workplace
          </label>
          <select
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400"
            defaultValue={request.requestedLocationId}
            id={`location-${request.id}`}
            name="approvedLocationId"
            required
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Workplace applies to Utility Worker and Technician access.
          </p>
        </div>
        <button
          className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:col-span-2 sm:justify-self-end"
          type="submit"
        >
          Approve Access
        </button>
      </form>

      <form action={rejectAccess} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <input name="requestId" type="hidden" value={request.id} />
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700" htmlFor={`note-${request.id}`}>
            Review note (optional)
          </label>
          <input
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400"
            id={`note-${request.id}`}
            maxLength={1000}
            name="reviewNote"
          />
        </div>
        <button
          className="min-h-11 rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500"
          type="submit"
        >
          Reject
        </button>
      </form>
    </li>
  );
}

export function AccessRequestList({
  account,
  review,
}: {
  account: HumanAccount;
  review: AccessRequestReview;
}) {
  if (review.requests.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        No pending access requests for your organization.
      </div>
    );
  }
  return (
    <ul className="mt-8 space-y-4">
      {review.requests.map((request) => (
        <AccessRequestCard
          account={account}
          key={request.id}
          request={request}
          review={review}
        />
      ))}
    </ul>
  );
}
