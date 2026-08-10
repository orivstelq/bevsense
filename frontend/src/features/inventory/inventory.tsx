import {
  getDemoTranslations,
  type DemoLanguage,
} from "@/config/demo-translations";
import { deriveCurrentInventoryEntries } from "@/lib/inventory/current-inventory";
import type { LocationTelemetrySnapshot } from "@/types/domain";

import { InventorySummary } from "./inventory-summary";
import { InventoryTrayCard } from "./inventory-tray-card";

type InventoryProps = {
  snapshot: LocationTelemetrySnapshot;
  language: DemoLanguage;
};

export function Inventory({ snapshot, language }: InventoryProps) {
  const copy = getDemoTranslations(language);
  const trayEntries = deriveCurrentInventoryEntries(snapshot);
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
          {copy.navigation.inventory}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          {copy.inventoryDescription}
        </p>
      </section>

      <aside className="rounded-r-md border-l-4 border-amber-500 bg-amber-50 px-4 py-4 sm:px-5">
        <h2 className="text-sm font-bold tracking-[0.08em] text-amber-950">
          DETERMINISTIC SIMULATION DATA
        </h2>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          Inventory levels are derived from fixed fixture weights, not live
          physical sensor readings.
        </p>
      </aside>

      <InventorySummary
        assignedItemCount={assignedItemCount}
        configuredTrayCount={trayEntries.length}
        language={language}
        unassignedTrayCount={trayEntries.length - assignedItemCount}
      />

      <section aria-labelledby="rack-inventory-title">
        <div className="mb-4">
          <h2
            className="text-lg font-semibold text-slate-950"
            id="rack-inventory-title"
          >
            {copy.rackInventory}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Three racks with ten monitored BiB positions each.
          </p>
        </div>

        <div className="space-y-6">
          {[1, 2, 3].map((rackNumber) => {
            const rackEntries = trayEntries.filter(
              (entry) => entry.rackPosition?.rackNumber === rackNumber,
            );

            return (
              <section
                aria-labelledby={`rack-${rackNumber}-title`}
                className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                key={rackNumber}
              >
                <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                  <h3
                    className="text-base font-semibold text-slate-950"
                    id={`rack-${rackNumber}-title`}
                  >
                    {copy.rack} {rackNumber}
                  </h3>
                  <span className="text-xs font-medium text-slate-500">
                    {rackEntries.length} {copy.positions}
                  </span>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {rackEntries.map((entry) => (
                    <li className="min-w-0" key={entry.tray.id}>
                      <InventoryTrayCard entry={entry} language={language} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
