import { deriveInventoryState } from "@/lib/inventory-calculations";
import { selectLatestReadingForTray } from "@/lib/telemetry/selectors";
import type { LocationTelemetrySnapshot } from "@/types/domain";

import { InventorySummary } from "./inventory-summary";
import { InventoryTrayCard } from "./inventory-tray-card";

type InventoryProps = {
  snapshot: LocationTelemetrySnapshot;
};

export function Inventory({ snapshot }: InventoryProps) {
  const trayEntries = snapshot.sensorTrays.map((tray) => {
    const inventoryItem =
      snapshot.inventoryItems.find(
        (item) =>
          item.organizationId === snapshot.organizationId &&
          item.locationId === snapshot.locationId &&
          item.trayId === tray.id,
      ) ?? null;
    const latestReading = selectLatestReadingForTray(
      snapshot.telemetryReadings,
      {
        organizationId: snapshot.organizationId,
        locationId: snapshot.locationId,
        trayId: tray.id,
      },
    );
    const controller =
      snapshot.controllers.find(
        (candidate) =>
          candidate.organizationId === snapshot.organizationId &&
          candidate.locationId === snapshot.locationId &&
          candidate.id === tray.controllerId,
      ) ?? null;
    const derivedState =
      inventoryItem && latestReading
        ? deriveInventoryState(latestReading, inventoryItem)
        : null;

    return {
      tray,
      inventoryItem,
      latestReading,
      controller,
      derivedState,
    };
  });
  const assignedItemCount = trayEntries.filter(
    (entry) => entry.inventoryItem !== null,
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section aria-labelledby="inventory-title">
        <p className="text-sm font-medium text-slate-500">Operations</p>
        <h1
          className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
          id="inventory-title"
        >
          Inventory
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Current BiB assignments and derived product levels by sensor tray.
        </p>
      </section>

      <aside className="rounded-r-md border-l-4 border-amber-500 bg-amber-50 px-4 py-4 sm:px-5">
        <h2 className="text-sm font-bold tracking-[0.08em] text-amber-950">
          DETERMINISTIC SIMULATION DATA
        </h2>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          Inventory levels below are derived from fixed demo fixtures, not live
          physical sensor readings.
        </p>
      </aside>

      <InventorySummary
        assignedItemCount={assignedItemCount}
        configuredTrayCount={trayEntries.length}
        unassignedTrayCount={trayEntries.length - assignedItemCount}
      />

      <section aria-labelledby="tray-inventory-title">
        <div className="mb-4">
          <h2
            className="text-lg font-semibold text-slate-950"
            id="tray-inventory-title"
          >
            Tray inventory
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Level labels are simulation display bands only, not operational
            alert thresholds.
          </p>
        </div>

        {trayEntries.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-slate-200 shadow-sm">
            <div className="hidden grid-cols-[minmax(10rem,1.2fr)_minmax(10rem,1.2fr)_minmax(8rem,0.8fr)_minmax(11rem,1.15fr)_minmax(10rem,1fr)] gap-5 border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600 xl:grid">
              <span>Tray</span>
              <span>Product</span>
              <span>Remaining</span>
              <span>Latest reading</span>
              <span>Controller</span>
            </div>
            <ul className="divide-y divide-slate-200">
              {trayEntries.map((entry) => (
                <li key={entry.tray.id}>
                  <InventoryTrayCard {...entry} />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
            No sensor trays are configured for this location.
          </div>
        )}
      </section>
    </div>
  );
}
