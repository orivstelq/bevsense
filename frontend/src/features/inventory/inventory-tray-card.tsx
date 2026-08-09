import type { DerivedInventoryState } from "@/lib/inventory-calculations";
import type {
  Controller,
  InventoryItem,
  SensorTray,
  TelemetryReading,
} from "@/types/domain";

type InventoryTrayCardProps = {
  tray: SensorTray;
  inventoryItem: InventoryItem | null;
  latestReading: TelemetryReading | null;
  derivedState: DerivedInventoryState | null;
  controller: Controller | null;
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

const controllerStatusLabels = {
  online: "Online",
  offline: "Offline",
  unknown: "Unknown",
} as const;

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);

  return Number.isNaN(date.getTime())
    ? "Timestamp unavailable"
    : timestampFormatter.format(date);
}

function getLevelPresentation(percentage: number) {
  if (percentage > 50) {
    return { label: "Healthy", barClassName: "bg-emerald-600" };
  }

  if (percentage >= 20) {
    return { label: "Attention", barClassName: "bg-amber-500" };
  }

  return { label: "Low", barClassName: "bg-rose-600" };
}

export function InventoryTrayCard({
  tray,
  inventoryItem,
  latestReading,
  derivedState,
  controller,
}: InventoryTrayCardProps) {
  const roundedPercentage =
    derivedState?.remainingPercentage == null
      ? null
      : Math.round(derivedState.remainingPercentage);
  const levelPresentation =
    roundedPercentage == null
      ? null
      : getLevelPresentation(roundedPercentage);

  return (
    <article className="grid min-w-0 gap-5 bg-white px-4 py-5 sm:grid-cols-2 sm:px-5 xl:grid-cols-[minmax(10rem,1.2fr)_minmax(10rem,1.2fr)_minmax(8rem,0.8fr)_minmax(11rem,1.15fr)_minmax(10rem,1fr)] xl:items-center">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 xl:sr-only">
          Tray
        </p>
        <h3 className="mt-1 break-words text-sm font-semibold text-slate-950 xl:mt-0">
          {tray.name}
        </h3>
        <p className="mt-1 text-sm text-slate-600">{tray.family} tray</p>
        <span className="mt-2 inline-flex rounded-sm border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-900">
          Simulated
        </span>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 xl:sr-only">
          Product
        </p>
        {inventoryItem ? (
          <>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950 xl:mt-0">
              {inventoryItem.productName}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {inventoryItem.containerSizeGallons}-gallon BiB
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm font-semibold text-slate-950 xl:mt-0">
              Unassigned tray
            </p>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              No BiB inventory item is configured for this tray.
            </p>
          </>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 xl:sr-only">
          Remaining
        </p>
        {roundedPercentage != null && levelPresentation ? (
          <>
            <div className="mt-1 flex items-baseline justify-between gap-2 xl:mt-0">
              <span className="text-lg font-semibold text-slate-950">
                {roundedPercentage}%
              </span>
              <span className="text-xs font-medium text-slate-600">
                {levelPresentation.label}
              </span>
            </div>
            <div
              aria-label={`${inventoryItem?.productName ?? "Product"} remaining`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={roundedPercentage}
              aria-valuetext={`${roundedPercentage}% remaining, ${levelPresentation.label.toLowerCase()} display band`}
              className="mt-2 h-2 w-full overflow-hidden rounded-sm bg-slate-200"
              role="progressbar"
            >
              <div
                className={`h-full ${levelPresentation.barClassName}`}
                style={{ width: `${roundedPercentage}%` }}
              />
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm font-medium text-slate-600 xl:mt-0">
            {!inventoryItem
              ? "Not applicable"
              : !latestReading
                ? "Awaiting telemetry"
                : "Unavailable"}
          </p>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 xl:sr-only">
          Latest reading
        </p>
        {latestReading ? (
          <>
            <time
              className="mt-1 block text-sm font-medium text-slate-800 xl:mt-0"
              dateTime={latestReading.timestamp}
            >
              {formatTimestamp(latestReading.timestamp)}
            </time>
            <p className="mt-1 text-xs text-slate-500">Simulated reading</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-600 xl:mt-0">
            No reading available
          </p>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 xl:sr-only">
          Controller
        </p>
        {controller ? (
          <>
            <p className="mt-1 break-words text-sm font-medium text-slate-800 xl:mt-0">
              {controller.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Simulated · {controllerStatusLabels[controller.status]}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm font-medium text-slate-700 xl:mt-0">
              Controller unavailable
            </p>
            <p className="mt-1 text-xs text-slate-500">
              No matching controller in this location.
            </p>
          </>
        )}
      </div>
    </article>
  );
}
