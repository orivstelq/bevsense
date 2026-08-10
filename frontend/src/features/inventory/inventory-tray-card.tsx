import {
  getDemoTranslations,
  type DemoLanguage,
} from "@/config/demo-translations";
import { getInventoryLevelPresentation } from "@/config/inventory-levels";
import type { CurrentInventoryEntry } from "@/lib/inventory/current-inventory";

type InventoryTrayCardProps = {
  entry: CurrentInventoryEntry;
  language: DemoLanguage;
};

const timestampFormatters = {
  en: new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }),
  es: new Intl.DateTimeFormat("es-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }),
} as const;

function formatTimestamp(timestamp: string, language: DemoLanguage) {
  const date = new Date(timestamp);

  return Number.isNaN(date.getTime())
    ? "Timestamp unavailable"
    : timestampFormatters[language].format(date);
}

export function InventoryTrayCard({
  entry: {
    controller,
    derivedState,
    inventoryItem,
    latestReading,
    rackPosition,
    tray,
  },
  language,
}: InventoryTrayCardProps) {
  const copy = getDemoTranslations(language);
  const level =
    derivedState?.remainingPercentage == null
      ? null
      : getInventoryLevelPresentation(derivedState.remainingPercentage);
  const levelLabel = level ? copy[level.band] : null;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {copy.position} {rackPosition?.positionNumber ?? "?"}
          </p>
          <h4 className="mt-1 break-words text-sm font-semibold text-slate-950">
            {inventoryItem?.productName ?? "Unassigned"}
          </h4>
        </div>
        {level && levelLabel && (
          <span
            className={`shrink-0 rounded-sm border px-2 py-1 text-[11px] font-semibold ${level.badgeClassName}`}
          >
            {levelLabel}
          </span>
        )}
      </div>

      {level && levelLabel ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl font-semibold text-slate-950">
              {level.roundedPercentage}%
            </span>
            <span className="text-xs text-slate-500">{tray.family}</span>
          </div>
          <div
            aria-label={`${inventoryItem?.productName ?? copy.product} ${copy.remaining.toLowerCase()}`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={level.roundedPercentage}
            aria-valuetext={`${level.roundedPercentage}% ${copy.remaining.toLowerCase()}, ${levelLabel}`}
            className="mt-2 h-2 w-full overflow-hidden rounded-sm bg-slate-200"
            role="progressbar"
          >
            <div
              className={`h-full ${level.barClassName}`}
              style={{ width: `${level.roundedPercentage}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm font-medium text-slate-600">
          {inventoryItem ? "Awaiting telemetry" : "Not applicable"}
        </p>
      )}

      <dl className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs">
        <div>
          <dt className="font-medium text-slate-500">{copy.latestReading}</dt>
          <dd className="mt-0.5 break-words text-slate-700">
            {latestReading
              ? formatTimestamp(latestReading.timestamp, language)
              : "No reading available"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">{copy.controller}</dt>
          <dd className="mt-0.5 break-words text-slate-700">
            {controller?.name ?? "Unavailable"}
          </dd>
        </div>
      </dl>
    </article>
  );
}
