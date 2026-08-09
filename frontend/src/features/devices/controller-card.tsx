import type {
  Controller,
  InventoryItem,
  SensorTray,
  SensorTrayStatus,
} from "@/types/domain";

type SensorTrayListProps = {
  trays: readonly SensorTray[];
  inventoryItems: readonly InventoryItem[];
  controllerName: string | null;
};

type ControllerCardProps = {
  controller: Controller;
  trays: readonly SensorTray[];
  inventoryItems: readonly InventoryItem[];
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

const controllerStatusClassNames = {
  online: "border-emerald-200 bg-emerald-50 text-emerald-800",
  offline: "border-rose-200 bg-rose-50 text-rose-800",
  unknown: "border-slate-300 bg-slate-100 text-slate-700",
} as const;

const trayStatusClassNames = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  offline: "border-rose-200 bg-rose-50 text-rose-800",
  fault: "border-rose-200 bg-rose-50 text-rose-800",
  unknown: "border-slate-300 bg-slate-100 text-slate-700",
} as const satisfies Record<SensorTrayStatus, string>;

function formatLastSeen(timestamp: string | null) {
  if (timestamp === null) {
    return "No last-seen timestamp";
  }

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime())
    ? "Timestamp unavailable"
    : timestampFormatter.format(date);
}

function pluralize(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export function SensorTrayList({
  trays,
  inventoryItems,
  controllerName,
}: SensorTrayListProps) {
  if (trays.length === 0) {
    return (
      <p className="border-t border-slate-200 px-5 py-5 text-sm text-slate-600">
        No sensor trays configured.
      </p>
    );
  }

  return (
    <div className="border-t border-slate-200">
      <div className="hidden grid-cols-[minmax(10rem,1.4fr)_minmax(7rem,0.8fr)_minmax(9rem,0.9fr)_minmax(8rem,0.8fr)] gap-5 border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600 md:grid">
        <span>Sensor tray</span>
        <span>Tray family</span>
        <span>Simulated status</span>
        <span>Assignment</span>
      </div>
      <ul className="divide-y divide-slate-200">
        {trays.map((tray) => {
          const isAssigned = inventoryItems.some(
            (item) =>
              item.organizationId === tray.organizationId &&
              item.locationId === tray.locationId &&
              item.trayId === tray.id,
          );

          return (
            <li
              className="grid min-w-0 gap-4 bg-white px-4 py-4 sm:px-5 md:grid-cols-[minmax(10rem,1.4fr)_minmax(7rem,0.8fr)_minmax(9rem,0.9fr)_minmax(8rem,0.8fr)] md:items-center md:gap-5"
              key={tray.id}
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 md:sr-only">
                  Sensor tray
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-950 md:mt-0">
                  {tray.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {controllerName
                    ? `Attached to ${controllerName}`
                    : "Controller relationship unresolved"}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 md:sr-only">
                  Tray family
                </p>
                <p className="mt-1 text-sm text-slate-700 md:mt-0">
                  {tray.family}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 md:sr-only">
                  Simulated status
                </p>
                <span
                  className={`mt-1 inline-flex rounded-sm border px-2 py-1 text-xs font-semibold md:mt-0 ${trayStatusClassNames[tray.status]}`}
                >
                  Simulated {tray.status}
                </span>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 md:sr-only">
                  Assignment
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700 md:mt-0">
                  {isAssigned ? "Assigned" : "Unassigned"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ControllerCard({
  controller,
  trays,
  inventoryItems,
}: ControllerCardProps) {
  return (
    <article
      aria-labelledby={`controller-${controller.id}`}
      className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
    >
      <div className="grid gap-5 px-4 py-5 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="break-words text-base font-semibold text-slate-950 sm:text-lg"
              id={`controller-${controller.id}`}
            >
              {controller.name}
            </h3>
            <span className="rounded-sm border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-900">
              Demo controller
            </span>
          </div>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                Last seen in fixture
              </dt>
              <dd className="mt-1 text-slate-700">
                {controller.lastSeenAt ? (
                  <time dateTime={controller.lastSeenAt}>
                    {formatLastSeen(controller.lastSeenAt)}
                  </time>
                ) : (
                  formatLastSeen(null)
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                Attached trays
              </dt>
              <dd className="mt-1 text-slate-700">
                {pluralize(trays.length, "sensor tray")}
              </dd>
            </div>
            {controller.firmwareVersion && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                  Firmware
                </dt>
                <dd className="mt-1 text-slate-700">
                  {controller.firmwareVersion}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <span
          className={`inline-flex w-fit rounded-sm border px-3 py-1.5 text-sm font-semibold ${controllerStatusClassNames[controller.status]}`}
        >
          Simulated {controller.status}
        </span>
      </div>

      <SensorTrayList
        controllerName={controller.name}
        inventoryItems={inventoryItems}
        trays={trays}
      />
    </article>
  );
}
