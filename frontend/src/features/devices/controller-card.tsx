import {
  getDemoTranslations,
  type DemoLanguage,
} from "@/config/demo-translations";
import { parseRackPosition } from "@/lib/inventory/current-inventory";
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
  language: DemoLanguage;
};

type ControllerCardProps = {
  controller: Controller;
  trays: readonly SensorTray[];
  inventoryItems: readonly InventoryItem[];
  language: DemoLanguage;
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
  language,
}: SensorTrayListProps) {
  const copy = getDemoTranslations(language);
  if (trays.length === 0) {
    return (
      <p className="border-t border-slate-200 px-5 py-5 text-sm text-slate-600">
        No sensor trays configured.
      </p>
    );
  }

  return (
    <div className="space-y-5 border-t border-slate-200 p-4 sm:p-5">
      {[1, 2, 3].map((rackNumber) => {
        const rackTrays = trays.filter(
          (tray) => parseRackPosition(tray.name)?.rackNumber === rackNumber,
        );

        return (
          <section aria-labelledby={`device-rack-${rackNumber}`} key={rackNumber}>
            <h4
              className="mb-3 text-sm font-semibold text-slate-900"
              id={`device-rack-${rackNumber}`}
            >
              {copy.rack} {rackNumber}
            </h4>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {rackTrays.map((tray) => {
                const rackPosition = parseRackPosition(tray.name);
                const isAssigned = inventoryItems.some(
                  (item) => item.trayId === tray.id,
                );

                return (
                  <li
                    className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3"
                    key={tray.id}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      {copy.position} {rackPosition?.positionNumber ?? "?"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {tray.family}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-sm border px-2 py-1 text-xs font-semibold capitalize ${trayStatusClassNames[tray.status]}`}
                      >
                        {tray.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        {isAssigned ? "Assigned" : "Unassigned"}
                      </span>
                    </div>
                    {!controllerName && (
                      <p className="mt-2 text-xs text-amber-800">
                        Controller relationship unresolved
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function ControllerCard({
  controller,
  trays,
  inventoryItems,
  language,
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
          <span className="capitalize">{controller.status}</span>
        </span>
      </div>

      <SensorTrayList
        controllerName={controller.name}
        inventoryItems={inventoryItems}
        language={language}
        trays={trays}
      />
    </article>
  );
}
