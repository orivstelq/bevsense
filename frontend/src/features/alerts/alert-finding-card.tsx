import type { AlertKind, DerivedAlertFinding } from "@/types/alerts";

type AlertFindingCardProps = {
  finding: DerivedAlertFinding;
};

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

const severityPresentation = {
  critical: {
    label: "Critical",
    className: "border-rose-300 bg-rose-50 text-rose-800",
    accentClassName: "border-l-rose-500",
  },
  warning: {
    label: "Warning",
    className: "border-amber-300 bg-amber-50 text-amber-900",
    accentClassName: "border-l-amber-500",
  },
} as const;

const kindLabels = {
  "low-inventory": "Inventory",
  "telemetry-unavailable": "Telemetry",
  "controller-status": "Controller",
  "tray-status": "Sensor tray",
} as const satisfies Record<AlertKind, string>;

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  return Number.isNaN(date.getTime())
    ? "Timestamp unavailable"
    : timestampFormatter.format(date);
}

export function AlertFindingCard({ finding }: AlertFindingCardProps) {
  const presentation = severityPresentation[finding.severity];
  const dataSourceLabel =
    finding.dataSource === "simulated"
      ? "Simulated derived finding"
      : "Live derived finding";

  return (
    <article
      className={`min-w-0 rounded-md border border-l-4 border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${presentation.accentClassName}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-sm border px-2 py-1 text-xs font-semibold ${presentation.className}`}
        >
          {presentation.label}
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
          {kindLabels[finding.kind]}
        </span>
        <span className="text-xs text-slate-400" aria-hidden="true">
          ·
        </span>
        <span className="text-xs font-medium text-slate-500">
          {dataSourceLabel}
        </span>
      </div>

      <h3 className="mt-4 break-words text-base font-semibold text-slate-950 sm:text-lg">
        {finding.title}
      </h3>
      <p className="mt-2 break-words text-sm leading-6 text-slate-700">
        {finding.description}
      </p>

      <dl className="mt-4 grid gap-4 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Affected asset
          </dt>
          <dd className="mt-1 break-words font-medium text-slate-800">
            {finding.assetLabel}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
            Observed in simulation
          </dt>
          <dd className="mt-1 text-slate-700">
            {finding.observedAt ? (
              <time dateTime={finding.observedAt}>
                {formatTimestamp(finding.observedAt)}
              </time>
            ) : (
              "No observed timestamp"
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}
